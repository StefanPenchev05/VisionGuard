from __future__ import annotations

import json
import math
import os
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import mediapipe as mp
from interfaces.api.schemas.model_contract import (
    GesturePredictionSchema,
    GestureSampleReferenceSchema,
    TrainingDatasetSchema,
)


FeatureVector = list[float]
JpegDimensions = tuple[int | None, int | None]
NetworkWeights = dict[str, list]
ClassCentroids = dict[str, FeatureVector]
ClassRadii = dict[str, float]


class NoHandRegionDetected(ValueError):
    pass


MEDIAPIPE_HANDS = mp.solutions.hands


@dataclass(frozen=True)
class TrainedGestureModel:
    accuracy: float
    artifact_path: str
    model_id: str
    version: str


@dataclass(frozen=True)
class DetectedHand:
    box: tuple[int, int, int, int]
    features: FeatureVector


def read_jpeg_dimensions(data: bytes) -> JpegDimensions:
    if len(data) < 4 or data[:2] != b"\xff\xd8":
        return None, None

    index = 2
    while index + 9 < len(data):
        if data[index] != 0xFF:
            index += 1
            continue

        marker = data[index + 1]
        index += 2

        while marker == 0xFF and index < len(data):
            marker = data[index]
            index += 1

        if marker in {0xD8, 0xD9}:
            continue

        if index + 2 > len(data):
            break

        segment_length = int.from_bytes(data[index:index + 2], "big")
        if segment_length < 2:
            break

        if marker in {
            0xC0,
            0xC1,
            0xC2,
            0xC3,
            0xC5,
            0xC6,
            0xC7,
            0xC9,
            0xCA,
            0xCB,
            0xCD,
            0xCE,
            0xCF,
        }:
            start = index + 2
            if start + 5 <= len(data):
                height = int.from_bytes(data[start + 1:start + 3], "big")
                width = int.from_bytes(data[start + 3:start + 5], "big")
                return width, height

        index += segment_length

    return None, None


def normalized_histogram(data: bytes, buckets: int = 16) -> FeatureVector:
    histogram = [0] * buckets

    for byte in data:
        histogram[min(byte * buckets // 256, buckets - 1)] += 1

    total = len(data) or 1
    return [bucket / total for bucket in histogram]


def byte_entropy(data: bytes) -> float:
    histogram = normalized_histogram(data, 256)
    return -sum(value * math.log2(value) for value in histogram if value > 0) / 8


def segment_features(data: bytes, segments: int = 4) -> FeatureVector:
    if len(data) < segments:
        return normalized_histogram(data) * segments

    features: FeatureVector = []
    segment_size = max(1, len(data) // segments)

    for index in range(segments):
        start = index * segment_size
        end = len(data) if index == segments - 1 else start + segment_size
        features.extend(normalized_histogram(data[start:end], buckets=8))

    return features


def detect_face_boxes(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    if not hasattr(cv2, "CascadeClassifier"):
        return []

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade_path = str(
        Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    )
    classifier = cv2.CascadeClassifier(cascade_path)

    if classifier.empty():
        return []

    faces = classifier.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(48, 48),
    )
    return [(int(x), int(y), int(w), int(h)) for x, y, w, h in faces]


def padded_box(
    x: int,
    y: int,
    width: int,
    height: int,
    image_width: int,
    image_height: int,
    padding_ratio: float = 0.18,
) -> tuple[int, int, int, int]:
    padding = int(max(width, height) * padding_ratio)
    left = max(0, x - padding)
    top = max(0, y - padding)
    right = min(image_width, x + width + padding)
    bottom = min(image_height, y + height + padding)
    return left, top, right, bottom


def remove_face_regions(mask: np.ndarray, face_boxes: list[tuple[int, int, int, int]]) -> None:
    image_height, image_width = mask.shape[:2]

    for x, y, width, height in face_boxes:
        left, top, right, bottom = padded_box(
            x,
            y,
            width,
            height,
            image_width,
            image_height,
            padding_ratio=0.35,
        )
        mask[top:bottom, left:right] = 0


def build_skin_mask(image: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
    lower_hsv = np.array([0, 25, 45], dtype=np.uint8)
    upper_hsv = np.array([28, 255, 255], dtype=np.uint8)
    lower_ycrcb = np.array([0, 133, 77], dtype=np.uint8)
    upper_ycrcb = np.array([255, 173, 127], dtype=np.uint8)
    mask = cv2.bitwise_and(
        cv2.inRange(hsv, lower_hsv, upper_hsv),
        cv2.inRange(ycrcb, lower_ycrcb, upper_ycrcb),
    )
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    return cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)


def is_likely_face_candidate(
    *,
    area_ratio: float,
    aspect_ratio: float,
    center_x_ratio: float,
    center_y_ratio: float,
    fill_ratio: float,
) -> bool:
    return (
        0.012 <= area_ratio <= 0.20
        and 0.45 <= aspect_ratio <= 1.18
        and 0.24 <= center_x_ratio <= 0.76
        and center_y_ratio <= 0.56
        and fill_ratio >= 0.54
    )


def build_landmark_feature_vector(
    landmarks: list[tuple[float, float, float]],
    box: tuple[int, int, int, int],
    image_width: int,
    image_height: int,
) -> FeatureVector:
    left, top, width, height = box
    wrist_x, wrist_y, wrist_z = landmarks[0]
    scale = max(width / image_width, height / image_height, 0.001)
    normalized: FeatureVector = []

    for x, y, z in landmarks:
        normalized.extend([
            (x - wrist_x) / scale,
            (y - wrist_y) / scale,
            z - wrist_z,
        ])

    finger_tip_indices = [4, 8, 12, 16, 20]
    for index in finger_tip_indices:
        x, y, z = landmarks[index]
        normalized.append(
            math.sqrt((x - wrist_x) ** 2 + (y - wrist_y) ** 2 + (z - wrist_z) ** 2) / scale
        )

    for left_index, right_index in zip(finger_tip_indices, finger_tip_indices[1:]):
        left_x, left_y, left_z = landmarks[left_index]
        right_x, right_y, right_z = landmarks[right_index]
        normalized.append(
            math.sqrt(
                (left_x - right_x) ** 2
                + (left_y - right_y) ** 2
                + (left_z - right_z) ** 2
            ) / scale
        )

    normalized.extend([
        (left + width / 2) / image_width,
        (top + height / 2) / image_height,
        width / image_width,
        height / image_height,
        (width / height) if height else 0,
    ])

    return normalized


def detect_mediapipe_hands(image: np.ndarray) -> list[DetectedHand]:
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image_height, image_width = image.shape[:2]

    with MEDIAPIPE_HANDS.Hands(
        max_num_hands=2,
        min_detection_confidence=0.45,
        min_tracking_confidence=0.45,
        static_image_mode=True,
    ) as hands:
        result = hands.process(rgb_image)

    if not result.multi_hand_landmarks:
        return []

    detected_hands = []
    for hand_landmarks in result.multi_hand_landmarks:
        landmarks = [
            (landmark.x, landmark.y, landmark.z)
            for landmark in hand_landmarks.landmark
        ]
        xs = [landmark[0] for landmark in landmarks]
        ys = [landmark[1] for landmark in landmarks]
        left = max(0, int(min(xs) * image_width))
        top = max(0, int(min(ys) * image_height))
        right = min(image_width, int(max(xs) * image_width))
        bottom = min(image_height, int(max(ys) * image_height))
        width = right - left
        height = bottom - top

        if width <= 0 or height <= 0:
            continue

        box = (left, top, width, height)
        detected_hands.append(
            DetectedHand(
                box=box,
                features=build_landmark_feature_vector(
                    landmarks,
                    box,
                    image_width,
                    image_height,
                ),
            )
        )

    return detected_hands


def detect_mediapipe_hand_boxes(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    return [hand.box for hand in detect_mediapipe_hands(image)]


def find_skin_contour_hand_region(image: np.ndarray) -> tuple[int, int, int, int] | None:
    mask = build_skin_mask(image)
    remove_face_regions(mask, detect_face_boxes(image))
    contours, _hierarchy = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return None

    image_area = image.shape[0] * image.shape[1]
    candidate_boxes = []

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < max(900, image_area * 0.006):
            continue

        x, y, width, height = cv2.boundingRect(contour)
        box_area = width * height
        if box_area == 0:
            continue

        area_ratio = area / image_area
        fill_ratio = area / box_area
        aspect_ratio = width / height if height else 0
        center_x_ratio = (x + width / 2) / image.shape[1]
        center_y_ratio = (y + height / 2) / image.shape[0]
        width_ratio = width / image.shape[1]
        height_ratio = height / image.shape[0]

        if area_ratio > 0.45:
            continue

        if height_ratio > 0.82 or width_ratio > 0.45:
            continue

        if (x <= 4 or x + width >= image.shape[1] - 4) and height_ratio > 0.45:
            continue

        if fill_ratio > 0.92:
            continue

        if aspect_ratio < 0.22 or aspect_ratio > 4.5:
            continue

        if is_likely_face_candidate(
            area_ratio=area_ratio,
            aspect_ratio=aspect_ratio,
            center_x_ratio=center_x_ratio,
            center_y_ratio=center_y_ratio,
            fill_ratio=fill_ratio,
        ):
            continue

        candidate_boxes.append((area, x, y, width, height))

    if not candidate_boxes:
        return None

    _area, x, y, width, height = max(candidate_boxes, key=lambda item: item[0])
    return padded_box(x, y, width, height, image.shape[1], image.shape[0], padding_ratio=0.45)


def find_hand_region(image: np.ndarray) -> tuple[int, int, int, int] | None:
    mediapipe_boxes = detect_mediapipe_hand_boxes(image)
    if mediapipe_boxes:
        x, y, width, height = max(
            mediapipe_boxes,
            key=lambda box: box[2] * box[3],
        )
        return padded_box(x, y, width, height, image.shape[1], image.shape[0], padding_ratio=0.28)

    if os.environ.get("VISIONGUARD_ALLOW_SKIN_HAND_FALLBACK") == "1":
        return find_skin_contour_hand_region(image)

    return None


def extract_attention_region_bytes(data: bytes) -> bytes:
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)

    if image is None:
        raise NoHandRegionDetected("Could not decode image for hand detection.")

    region = find_hand_region(image)
    if region is None:
        raise NoHandRegionDetected("No hand region detected in frame.")

    left, top, right, bottom = region
    crop = image[top:bottom, left:right]

    if crop.size == 0:
        raise NoHandRegionDetected("Detected hand region is empty.")

    resized = cv2.resize(crop, (128, 128), interpolation=cv2.INTER_AREA)
    success, encoded = cv2.imencode(".jpg", resized, [int(cv2.IMWRITE_JPEG_QUALITY), 88])

    if not success:
        raise NoHandRegionDetected("Could not encode hand region crop.")

    return encoded.tobytes()


def extract_jpeg_crop_features(data: bytes) -> FeatureVector:
    focused_data = extract_attention_region_bytes(data)
    width, height = read_jpeg_dimensions(focused_data)
    total = len(focused_data)
    mean = sum(focused_data) / total
    variance = sum((byte - mean) ** 2 for byte in focused_data) / total
    aspect_ratio = (width / height) if width and height else 0

    return [
        total / 1_000_000,
        (width or 0) / 4096,
        (height or 0) / 4096,
        aspect_ratio / 4,
        mean / 255,
        math.sqrt(variance) / 255,
        byte_entropy(focused_data),
        *normalized_histogram(focused_data),
        *segment_features(focused_data),
    ]


def extract_image_features(file_path: str) -> FeatureVector:
    data = Path(file_path).read_bytes()

    if not data:
        raise ValueError(f"Sample file is empty: {file_path}")

    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)

    if image is None:
        raise NoHandRegionDetected("Could not decode image for hand detection.")

    detected_hands = detect_mediapipe_hands(image)
    if detected_hands:
        hand = max(detected_hands, key=lambda detected: detected.box[2] * detected.box[3])
        return hand.features

    if os.environ.get("VISIONGUARD_ALLOW_SKIN_HAND_FALLBACK") == "1":
        return extract_jpeg_crop_features(data)

    raise NoHandRegionDetected("No hand landmarks detected in frame.")


def detect_hand_presence(file_path: str) -> tuple[bool, str | None]:
    try:
        data = Path(file_path).read_bytes()
        if not data:
            return False, "Frame is empty."

        extract_attention_region_bytes(data)
    except NoHandRegionDetected as error:
        return False, str(error)

    return True, None


def relu(values: FeatureVector) -> FeatureVector:
    return [max(0.0, value) for value in values]


def softmax(logits: FeatureVector) -> FeatureVector:
    if len(logits) == 1:
        return [1.0]

    max_logit = max(logits)
    exp_values = [math.exp(value - max_logit) for value in logits]
    total = sum(exp_values)
    return [value / total for value in exp_values]


def dot(left: FeatureVector, right: FeatureVector) -> float:
    return sum(a * b for a, b in zip(left, right, strict=True))


def initialize_matrix(rows: int, columns: int, scale: float) -> list[FeatureVector]:
    return [
        [
            math.sin((row + 1) * 12.9898 + (column + 1) * 78.233) * scale
            for column in range(columns)
        ]
        for row in range(rows)
    ]


def forward_network(
    features: FeatureVector,
    weights: NetworkWeights,
) -> tuple[FeatureVector, FeatureVector, FeatureVector]:
    hidden_raw = [
        dot(row, features) + bias
        for row, bias in zip(weights["hiddenWeights"], weights["hiddenBias"], strict=True)
    ]
    hidden = relu(hidden_raw)
    logits = [
        dot(row, hidden) + bias
        for row, bias in zip(weights["outputWeights"], weights["outputBias"], strict=True)
    ]
    return hidden_raw, hidden, softmax(logits)


def train_neural_network(
    training_rows: list[tuple[FeatureVector, str]],
    label_ids: list[str],
    epochs: int = 260,
    hidden_size: int = 24,
    learning_rate: float = 0.04,
) -> NetworkWeights:
    if not training_rows:
        raise ValueError("Training data is empty.")

    input_size = len(training_rows[0][0])
    output_size = len(label_ids)
    label_index = {label_id: index for index, label_id in enumerate(label_ids)}
    weights: NetworkWeights = {
        "hiddenWeights": initialize_matrix(hidden_size, input_size, 0.08),
        "hiddenBias": [0.0] * hidden_size,
        "outputWeights": initialize_matrix(output_size, hidden_size, 0.08),
        "outputBias": [0.0] * output_size,
    }

    if output_size == 1:
        return weights

    for _ in range(epochs):
        for features, label_id in training_rows:
            hidden_raw, hidden, probabilities = forward_network(features, weights)
            target_index = label_index[label_id]
            output_errors = [
                probability - (1.0 if index == target_index else 0.0)
                for index, probability in enumerate(probabilities)
            ]

            hidden_errors = []
            for hidden_index, raw_value in enumerate(hidden_raw):
                error = sum(
                    output_error * weights["outputWeights"][output_index][hidden_index]
                    for output_index, output_error in enumerate(output_errors)
                )
                hidden_errors.append(error if raw_value > 0 else 0.0)

            for output_index, output_error in enumerate(output_errors):
                for hidden_index, hidden_value in enumerate(hidden):
                    weights["outputWeights"][output_index][hidden_index] -= (
                        learning_rate * output_error * hidden_value
                    )
                weights["outputBias"][output_index] -= learning_rate * output_error

            for hidden_index, hidden_error in enumerate(hidden_errors):
                for input_index, input_value in enumerate(features):
                    weights["hiddenWeights"][hidden_index][input_index] -= (
                        learning_rate * hidden_error * input_value
                    )
                weights["hiddenBias"][hidden_index] -= learning_rate * hidden_error

    return weights


def average_feature_vectors(vectors: list[FeatureVector]) -> FeatureVector:
    if not vectors:
        return []

    return [
        sum(vector[index] for vector in vectors) / len(vectors)
        for index in range(len(vectors[0]))
    ]


def build_class_profiles(
    features_by_label: dict[str, list[FeatureVector]],
) -> tuple[ClassCentroids, ClassRadii]:
    centroids: ClassCentroids = {}
    radii: ClassRadii = {}

    for label_id, vectors in features_by_label.items():
        centroid = average_feature_vectors(vectors)
        distances = [distance(vector, centroid) for vector in vectors]
        max_distance = max(distances) if distances else 0
        mean_distance = sum(distances) / len(distances) if distances else 0
        centroids[label_id] = centroid
        radii[label_id] = max(max_distance * 4, mean_distance * 6, 0.08)

    return centroids, radii


def predict_with_network(
    features: FeatureVector,
    labels: list[dict],
    weights: NetworkWeights,
) -> list[GesturePredictionSchema]:
    _hidden_raw, _hidden, probabilities = forward_network(features, weights)

    return sorted(
        [
            GesturePredictionSchema(
                gestureId=label["id"],
                label=label.get("name", label["id"]),
                confidence=probabilities[index],
            )
            for index, label in enumerate(labels)
        ],
        key=lambda prediction: prediction.confidence,
        reverse=True,
    )


def predict_with_class_profiles(
    features: FeatureVector,
    labels: list[dict],
    centroids: ClassCentroids,
    radii: ClassRadii,
) -> list[GesturePredictionSchema]:
    labels_by_id = {label["id"]: label for label in labels}
    predictions: list[GesturePredictionSchema] = []

    for label_id, centroid in centroids.items():
        radius = max(radii.get(label_id, 0.08), 0.001)
        feature_distance = distance(features, centroid)

        if feature_distance > radius:
            continue

        predictions.append(
            GesturePredictionSchema(
                gestureId=label_id,
                label=labels_by_id.get(label_id, {}).get("name", label_id),
                confidence=max(0, 1 - (feature_distance / radius)),
            )
        )

    return sorted(predictions, key=lambda prediction: prediction.confidence, reverse=True)


def distance(left: FeatureVector, right: FeatureVector) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right, strict=True)))


def train_gesture_model(
    dataset: TrainingDatasetSchema,
    samples: list[GestureSampleReferenceSchema],
    artifact_directory: Path,
    model_id: str = "default",
) -> TrainedGestureModel:
    if not dataset.labels:
        raise ValueError("Dataset must include at least one label.")

    if not samples:
        raise ValueError("Dataset must include at least one sample.")

    labels_by_id = {label.id: label for label in dataset.labels}
    features_by_label: dict[str, list[FeatureVector]] = defaultdict(list)
    training_rows: list[tuple[FeatureVector, str]] = []

    for sample in samples:
        if sample.gestureId not in labels_by_id:
            raise ValueError(f"Sample references unknown gesture label: {sample.gestureId}")

        features = extract_image_features(sample.filePath)
        features_by_label[sample.gestureId].append(features)
        training_rows.append((features, sample.gestureId))

    missing_labels = [
        label.name
        for label in dataset.labels
        if not features_by_label.get(label.id)
    ]
    if missing_labels:
        raise ValueError(f"Missing samples for labels: {', '.join(missing_labels)}")

    labels = [label.model_dump() for label in dataset.labels]
    label_ids = [label.id for label in dataset.labels]
    network = train_neural_network(training_rows, label_ids)
    centroids, class_radii = build_class_profiles(features_by_label)
    model_version = dataset.updatedAt.replace(":", "").replace("+", "-")
    artifact_directory.mkdir(parents=True, exist_ok=True)
    artifact_path = artifact_directory / f"{model_id}-{dataset.id}.json"
    payload = {
        "classRadii": class_radii,
        "centroids": centroids,
        "datasetId": dataset.id,
        "featureExtractor": "mediapipe-hand-landmarks-v6",
        "inputSize": len(training_rows[0][0]),
        "labels": labels,
        "modelBackend": "pure-python-mlp",
        "modelFamily": "gesture-recognition",
        "modelId": model_id,
        "network": network,
        "trainedSampleCount": len(samples),
        "version": model_version,
    }
    artifact_path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")

    return TrainedGestureModel(
        accuracy=estimate_training_accuracy(training_rows, labels, network),
        artifact_path=str(artifact_path),
        model_id=model_id,
        version=model_version,
    )


def estimate_training_accuracy(
    training_rows: list[tuple[FeatureVector, str]],
    labels: list[dict],
    weights: NetworkWeights,
) -> float:
    correct = 0
    scored = 0

    for features, label_id in training_rows:
        predictions = predict_with_network(features, labels, weights)
        correct += int(predictions[0].gestureId == label_id)
        scored += 1

    return correct / scored if scored else 0


def load_model_artifact(artifact_path: str) -> dict:
    return json.loads(Path(artifact_path).read_text(encoding="utf-8"))


def predict_gesture(
    artifact: dict,
    frame_file_path: str,
    min_confidence: float | None = None,
) -> list[GesturePredictionSchema]:
    try:
        feature = extract_image_features(frame_file_path)
    except NoHandRegionDetected:
        return []

    labels = artifact.get("labels", [])

    if artifact.get("modelBackend") == "pure-python-mlp" and artifact.get("network"):
        if len(labels) == 1 and artifact.get("centroids"):
            predictions = predict_with_class_profiles(
                feature,
                labels,
                artifact["centroids"],
                artifact.get("classRadii", {}),
            )
        else:
            predictions = predict_with_network(feature, labels, artifact["network"])

        return [
            prediction
            for prediction in predictions
            if min_confidence is None or prediction.confidence >= min_confidence
        ]

    centroids = artifact.get("centroids", {})
    labels_by_id = {label["id"]: label for label in labels}
    predictions = []
    for label_id, centroid in centroids.items():
        confidence = 1 / (1 + distance(feature, centroid))

        if min_confidence is not None and confidence < min_confidence:
            continue

        predictions.append(
            GesturePredictionSchema(
                gestureId=label_id,
                label=labels_by_id.get(label_id, {}).get("name", label_id),
                confidence=confidence,
            )
        )

    return sorted(predictions, key=lambda prediction: prediction.confidence, reverse=True)
