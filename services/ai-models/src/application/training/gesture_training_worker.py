from __future__ import annotations

import json
import math
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from statistics import fmean

from interfaces.api.schemas.model_contract import (
    GesturePredictionSchema,
    GestureSampleReferenceSchema,
    TrainingDatasetSchema,
)


FeatureVector = list[float]
JpegDimensions = tuple[int | None, int | None]


@dataclass(frozen=True)
class TrainedGestureModel:
    accuracy: float
    artifact_path: str
    model_id: str
    version: str


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


def extract_image_features(file_path: str) -> FeatureVector:
    data = Path(file_path).read_bytes()

    if not data:
        raise ValueError(f"Sample file is empty: {file_path}")

    width, height = read_jpeg_dimensions(data)
    total = len(data)
    mean = sum(data) / total
    variance = sum((byte - mean) ** 2 for byte in data) / total
    aspect_ratio = (width / height) if width and height else 0

    return [
        total / 1_000_000,
        (width or 0) / 4096,
        (height or 0) / 4096,
        aspect_ratio / 4,
        mean / 255,
        math.sqrt(variance) / 255,
        byte_entropy(data),
        *normalized_histogram(data),
        *segment_features(data),
    ]


def distance(left: FeatureVector, right: FeatureVector) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right, strict=True)))


def average_features(features: list[FeatureVector]) -> FeatureVector:
    return [fmean(values) for values in zip(*features, strict=True)]


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

    for sample in samples:
        if sample.gestureId not in labels_by_id:
            raise ValueError(f"Sample references unknown gesture label: {sample.gestureId}")

        features_by_label[sample.gestureId].append(extract_image_features(sample.filePath))

    missing_labels = [
        label.name
        for label in dataset.labels
        if not features_by_label.get(label.id)
    ]
    if missing_labels:
        raise ValueError(f"Missing samples for labels: {', '.join(missing_labels)}")

    centroids = {
        label_id: average_features(label_features)
        for label_id, label_features in features_by_label.items()
    }
    model_version = dataset.updatedAt.replace(":", "").replace("+", "-")
    artifact_directory.mkdir(parents=True, exist_ok=True)
    artifact_path = artifact_directory / f"{model_id}-{dataset.id}.json"
    payload = {
        "datasetId": dataset.id,
        "labels": [label.model_dump() for label in dataset.labels],
        "modelFamily": "gesture-recognition",
        "modelId": model_id,
        "trainedSampleCount": len(samples),
        "version": model_version,
        "centroids": centroids,
    }
    artifact_path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")

    return TrainedGestureModel(
        accuracy=estimate_training_accuracy(samples, centroids),
        artifact_path=str(artifact_path),
        model_id=model_id,
        version=model_version,
    )


def estimate_training_accuracy(
    samples: list[GestureSampleReferenceSchema],
    centroids: dict[str, FeatureVector],
) -> float:
    correct = 0
    scored = 0

    for sample in samples:
        feature = extract_image_features(sample.filePath)
        predicted_label_id = min(
            centroids,
            key=lambda label_id: distance(feature, centroids[label_id]),
        )
        correct += int(predicted_label_id == sample.gestureId)
        scored += 1

    return correct / scored if scored else 0


def load_model_artifact(artifact_path: str) -> dict:
    return json.loads(Path(artifact_path).read_text(encoding="utf-8"))


def predict_gesture(
    artifact: dict,
    frame_file_path: str,
    min_confidence: float | None = None,
) -> list[GesturePredictionSchema]:
    feature = extract_image_features(frame_file_path)
    centroids = artifact.get("centroids", {})
    labels = {label["id"]: label for label in artifact.get("labels", [])}

    predictions = []
    for label_id, centroid in centroids.items():
        confidence = 1 / (1 + distance(feature, centroid))

        if min_confidence is not None and confidence < min_confidence:
            continue

        predictions.append(
            GesturePredictionSchema(
                gestureId=label_id,
                label=labels.get(label_id, {}).get("name", label_id),
                confidence=confidence,
            )
        )

    return sorted(predictions, key=lambda prediction: prediction.confidence, reverse=True)
