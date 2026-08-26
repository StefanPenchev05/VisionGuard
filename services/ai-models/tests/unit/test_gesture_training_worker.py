from pathlib import Path

from application.training.gesture_training_worker import (
    extract_image_features,
    predict_gesture,
    read_jpeg_dimensions,
)


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


def test_read_jpeg_dimensions_from_sof_marker() -> None:
    assert read_jpeg_dimensions(build_minimal_jpeg(640, 360)) == (640, 360)


def test_extract_image_features_include_dimension_and_content_features(tmp_path: Path) -> None:
    sample_path = tmp_path / "sample.jpg"
    sample_path.write_bytes(build_minimal_jpeg(800, 600, payload_byte=24))

    features = extract_image_features(str(sample_path))

    assert features[1] == 800 / 4096
    assert features[2] == 600 / 4096
    assert len(features) > 50


def test_predict_gesture_sorts_predictions_by_confidence(tmp_path: Path) -> None:
    sample_path = tmp_path / "sample.jpg"
    sample_path.write_bytes(build_minimal_jpeg(320, 240, payload_byte=9))
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
