from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol


GestureActionType = Literal[
    "open-app",
    "volume-down",
    "volume-up",
    "mute",
    "keyboard-shortcut",
    "mouse-click",
]


@dataclass(frozen=True)
class GestureLabel:
    id: str
    name: str
    action_type: GestureActionType
    action_target: str


@dataclass(frozen=True)
class GestureSampleReference:
    id: str
    gesture_id: str
    captured_at: str
    file_path: str
    source: Literal["desktop-camera"]
    width: int | None = None
    height: int | None = None


@dataclass(frozen=True)
class TrainingDataset:
    id: str
    name: str
    labels: list[GestureLabel]
    sample_count: int
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class TrainingJob:
    id: str
    dataset_id: str
    model_family: Literal["gesture-recognition"]
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    progress: float
    started_at: str | None = None
    completed_at: str | None = None
    model_artifact_path: str | None = None
    error_message: str | None = None
    metrics: dict[str, object] | None = None


@dataclass(frozen=True)
class ModelStatus:
    model_id: str
    model_family: Literal["gesture-recognition", "continuous-authentication"]
    status: Literal["not-trained", "loading", "ready", "degraded", "error"]
    version: str | None = None
    accuracy: float | None = None
    latency_ms: float | None = None
    loaded_at: str | None = None
    error_message: str | None = None


@dataclass(frozen=True)
class InferenceFrameReference:
    captured_at: str
    frame_id: str
    file_path: str | None = None


@dataclass(frozen=True)
class GesturePrediction:
    gesture_id: str
    label: str
    confidence: float


@dataclass(frozen=True)
class InferenceResult:
    id: str
    frame_id: str
    model_id: str
    predictions: list[GesturePrediction]
    inference_time_ms: float
    created_at: str
    best_prediction: GesturePrediction | None = None


@dataclass(frozen=True)
class CreateTrainingDatasetRequest:
    name: str
    labels: list[GestureLabel]
    samples: list[GestureSampleReference]


@dataclass(frozen=True)
class TrainGestureModelRequest:
    dataset_id: str
    epochs: int | None = None
    batch_size: int | None = None
    learning_rate: float | None = None


@dataclass(frozen=True)
class RunGestureInferenceRequest:
    frame: InferenceFrameReference
    model_id: str | None = None
    min_confidence: float | None = None


class AiModelServiceContract(Protocol):
    async def create_training_dataset(
        self, request: CreateTrainingDatasetRequest
    ) -> TrainingDataset: ...

    async def get_model_status(self, model_id: str | None = None) -> ModelStatus: ...

    async def get_training_job(self, job_id: str) -> TrainingJob: ...

    async def list_datasets(self) -> list[TrainingDataset]: ...

    async def run_gesture_inference(
        self, request: RunGestureInferenceRequest
    ) -> InferenceResult: ...

    async def train_gesture_model(self, request: TrainGestureModelRequest) -> TrainingJob: ...
