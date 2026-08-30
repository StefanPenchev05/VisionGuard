from pathlib import Path

import cv2
import numpy as np
import pytest
from application.training.gesture_training_worker import (
    build_landmark_feature_vector,
    detect_hand_presence,
    extract_attention_region_bytes,
    extract_image_features,
    load_model_artifact,
    NoHandRegionDetected,
    predict_gesture,
    read_jpeg_dimensions,
    train_gesture_model,
)
from interfaces.api.schemas.model_contract import (
    GestureLabelSchema,
    GestureSampleReferenceSchema,
    TrainingDatasetSchema,
)


@pytest.fixture(autouse=True)
def allow_synthetic_skin_hand_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("VISIONGUARD_ALLOW_SKIN_HAND_FALLBACK", "1")


def build_minimal_jpeg(width: int, height: int, payload_byte: int = 1) -> bytes:
    return (
        b"\xff\xd8"
        b"\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xc0\x00\x11\x08"
        + height.to_bytes(2, "big")
        + width.to_bytes(2, "big")
        + b"\x03\x01\x11\x00\x02\x11\x01\x03\x11\x01"
        + b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00"
        + bytes([payload_byte]) * 64
        + b"\xff\xd9"
    )


def write_skin_blob_image(path: Path) -> None:
    image = np.zeros((360, 640, 3), dtype=np.uint8)
    image[:, :] = (35, 35, 35)
    cv2.rectangle(image, (395, 218), (482, 310), (80, 140, 200), -1)
    for finger_index, x in enumerate([398, 420, 442, 464]):
        cv2.rectangle(
            image,
            (x, 122 + finger_index * 6),
            (x + 15, 230),
            (80, 140, 200),
            -1,
        )
    cv2.circle(image, (386, 258), 24, (100, 150, 220), -1)
    assert cv2.imwrite(str(path), image)


def write_different_hand_like_image(path: Path) -> None:
    image = np.zeros((360, 640, 3), dtype=np.uint8)
    image[:, :] = (35, 35, 35)
    cv2.ellipse(image, (452, 250), (42, 96), 22, 0, 360, (120, 170, 220), -1)
    cv2.circle(image, (370, 172), 24, (120, 170, 220), -1)
    assert cv2.imwrite(str(path), image)


def write_face_only_image(path: Path) -> None:
    image = np.zeros((360, 640, 3), dtype=np.uint8)
    image[:, :] = (35, 35, 35)
    cv2.ellipse(image, (320, 138), (58, 76), 0, 0, 360, (110, 160, 215), -1)
    assert cv2.imwrite(str(path), image)


def write_face_with_curtain_image(path: Path) -> None:
    image = np.zeros((720, 1280, 3), dtype=np.uint8)
    image[:, :] = (210, 222, 224)
    cv2.rectangle(image, (850, 0), (1130, 720), (75, 150, 205), -1)
    cv2.rectangle(image, (0, 0), (130, 720), (70, 135, 190), -1)
    cv2.ellipse(image, (640, 330), (115, 165), 0, 0, 360, (95, 145, 205), -1)
    cv2.rectangle(image, (500, 480), (780, 720), (35, 74, 64), -1)
    assert cv2.imwrite(str(path), image)


def test_read_jpeg_dimensions_from_sof_marker() -> None:
    assert read_jpeg_dimensions(build_minimal_jpeg(640, 360)) == (640, 360)


def test_landmark_feature_vector_has_stable_shape() -> None:
    landmarks = [
        (index / 100, index / 120, index / 1000)
        for index in range(21)
    ]

    features = build_landmark_feature_vector(
        landmarks,
        box=(100, 80, 160, 220),
        image_width=640,
        image_height=360,
    )

    assert len(features) == 77
    assert features[0:3] == [0, 0, 0]
    assert features[-5:] == [
        (100 + 160 / 2) / 640,
        (80 + 220 / 2) / 360,
        160 / 640,
        220 / 360,
        160 / 220,
    ]


def test_extract_image_features_include_dimension_and_content_features(tmp_path: Path) -> None:
    sample_path = tmp_path / "sample.jpg"
    write_skin_blob_image(sample_path)

    features = extract_image_features(str(sample_path))

    assert features[1] == 128 / 4096
    assert features[2] == 128 / 4096
    assert len(features) > 50


def test_extract_image_features_rejects_frames_without_detected_hand(tmp_path: Path) -> None:
    sample_path = tmp_path / "background.jpg"
    image = np.zeros((360, 640, 3), dtype=np.uint8)
    image[:, :] = (35, 35, 35)
    assert cv2.imwrite(str(sample_path), image)

    try:
        extract_image_features(str(sample_path))
    except NoHandRegionDetected as error:
        assert "No hand region detected" in str(error)
    else:
        raise AssertionError("Expected hand-only feature extraction to reject background.")


def test_extract_image_features_rejects_face_without_visible_hand(tmp_path: Path) -> None:
    sample_path = tmp_path / "face-only.jpg"
    write_face_only_image(sample_path)

    try:
        extract_image_features(str(sample_path))
    except NoHandRegionDetected as error:
        assert "No hand region detected" in str(error)
    else:
        raise AssertionError("Expected hand-only feature extraction to reject face-only frame.")


def test_hand_presence_rejects_face_and_curtain_without_visible_hand(tmp_path: Path) -> None:
    sample_path = tmp_path / "face-curtain.jpg"
    write_face_with_curtain_image(sample_path)

    hand_detected, reason = detect_hand_presence(str(sample_path))

    assert hand_detected is False
    assert reason


def test_attention_region_focuses_on_hand_like_foreground(tmp_path: Path) -> None:
    image_path = tmp_path / "frame.jpg"
    write_skin_blob_image(image_path)

    focused_data = extract_attention_region_bytes(image_path.read_bytes())
    focused_image = cv2.imdecode(np.frombuffer(focused_data, dtype=np.uint8), cv2.IMREAD_COLOR)

    assert focused_image is not None
    assert focused_image.shape[:2] == (128, 128)
    assert len(focused_data) < image_path.stat().st_size


def test_predict_gesture_sorts_predictions_by_confidence(tmp_path: Path) -> None:
    sample_path = tmp_path / "sample.jpg"
    write_skin_blob_image(sample_path)
    features = extract_image_features(str(sample_path))

    predictions = predict_gesture(
        {
            "labels": [
                {"id": "near", "name": "Near Gesture"},
                {"id": "far", "name": "Far Gesture"},
            ],
            "centroids": {
                "near": features,
                "far": [value + 2 for value in features],
            },
        },
        str(sample_path),
        min_confidence=None,
    )

    assert predictions[0].gestureId == "near"
    assert predictions[0].confidence > predictions[1].confidence


def test_train_gesture_model_writes_neural_network_artifact(tmp_path: Path) -> None:
    samples = []
    labels = [
        GestureLabelSchema(
            actionTarget="Safari",
            actionType="open-app",
            id="open-palm",
            name="Open Palm",
        ),
        GestureLabelSchema(
            actionTarget="Toggle mute",
            actionType="mute",
            id="closed-fist",
            name="Closed Fist",
        ),
    ]

    for index in range(1, 7):
        open_path = tmp_path / f"open-palm-{index}.jpg"
        fist_path = tmp_path / f"closed-fist-{index}.jpg"
        write_skin_blob_image(open_path)
        image = np.zeros((360, 640, 3), dtype=np.uint8)
        image[:, :] = (35, 35, 35)
        cv2.rectangle(image, (405, 232), (505, 318), (120, 170, 220), -1)
        for knuckle_index, x in enumerate([408, 432, 456, 480]):
            cv2.circle(
                image,
                (x, 226 + (knuckle_index % 2) * 5),
                18,
                (120, 170, 220),
                -1,
            )
        assert cv2.imwrite(str(fist_path), image)
        samples.extend(
            [
                GestureSampleReferenceSchema(
                    capturedAt="2026-08-26T00:00:00+00:00",
                    filePath=str(open_path),
                    gestureId="open-palm",
                    id=f"open-{index}",
                    source="desktop-camera",
                ),
                GestureSampleReferenceSchema(
                    capturedAt="2026-08-26T00:00:00+00:00",
                    filePath=str(fist_path),
                    gestureId="closed-fist",
                    id=f"fist-{index}",
                    source="desktop-camera",
                ),
            ]
        )

    trained_model = train_gesture_model(
        TrainingDatasetSchema(
            createdAt="2026-08-26T00:00:00+00:00",
            id="dataset-test",
            labels=labels,
            name="Gesture Dataset",
            sampleCount=len(samples),
            updatedAt="2026-08-26T00:00:00+00:00",
        ),
        samples,
        tmp_path / "models",
    )
    artifact = load_model_artifact(trained_model.artifact_path)

    assert artifact["modelBackend"] == "pure-python-mlp"
    assert artifact["featureExtractor"] == "mediapipe-hand-landmarks-v6"
    assert artifact["inputSize"] > 50
    assert trained_model.accuracy >= 0.9

    predictions = predict_gesture(
        artifact,
        str(tmp_path / "open-palm-1.jpg"),
        min_confidence=None,
    )
    assert predictions[0].gestureId == "open-palm"


def test_single_label_model_rejects_unlike_hand_region(tmp_path: Path) -> None:
    samples = []
    label = GestureLabelSchema(
        actionTarget="Safari",
        actionType="open-app",
        id="middle-finger",
        name="Middle Finger",
    )

    for index in range(1, 7):
        sample_path = tmp_path / f"middle-finger-{index}.jpg"
        write_skin_blob_image(sample_path)
        samples.append(
            GestureSampleReferenceSchema(
                capturedAt="2026-08-26T00:00:00+00:00",
                filePath=str(sample_path),
                gestureId="middle-finger",
                id=f"sample-{index}",
                source="desktop-camera",
            )
        )

    trained_model = train_gesture_model(
        TrainingDatasetSchema(
            createdAt="2026-08-26T00:00:00+00:00",
            id="dataset-single-label",
            labels=[label],
            name="Gesture Dataset",
            sampleCount=len(samples),
            updatedAt="2026-08-26T00:00:00+00:00",
        ),
        samples,
        tmp_path / "models",
    )
    artifact = load_model_artifact(trained_model.artifact_path)
    unlike_path = tmp_path / "unlike.jpg"
    write_different_hand_like_image(unlike_path)

    predictions = predict_gesture(
        artifact,
        str(unlike_path),
        min_confidence=0.75,
    )

    assert predictions == []
