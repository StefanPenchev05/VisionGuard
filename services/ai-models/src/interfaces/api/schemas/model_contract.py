from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


GestureActionType = Literal[
    "open-app",
    "volume-down",
    "volume-up",
    "mute",
    "keyboard-shortcut",
    "mouse-click",
]


class GestureLabelSchema(BaseModel):
    id: str
    name: str
    actionType: GestureActionType
    actionTarget: str


class GestureSampleReferenceSchema(BaseModel):
    id: str
    gestureId: str
    capturedAt: str
    filePath: str
    source: Literal["desktop-camera"]
    width: int | None = None
    height: int | None = None


class TrainingDatasetSchema(BaseModel):
    id: str
    name: str
    labels: list[GestureLabelSchema]
    sampleCount: int
    createdAt: str
    updatedAt: str


class ModelConfigSchema(BaseModel):
    epochs: int | None = None
    batchSize: int | None = None
    learningRate: float | None = None


class CreateTrainingDatasetRequestSchema(BaseModel):
    name: str
    labels: list[GestureLabelSchema]
    samples: list[GestureSampleReferenceSchema]


class TrainGestureModelRequestSchema(BaseModel):
    datasetId: str
    modelConfig: ModelConfigSchema | None = None


class TrainingJobSchema(BaseModel):
    id: str
    datasetId: str
    modelFamily: Literal["gesture-recognition"] = "gesture-recognition"
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    progress: float = Field(ge=0, le=1)
    startedAt: str | None = None
    completedAt: str | None = None
    modelArtifactPath: str | None = None
    errorMessage: str | None = None


class ModelStatusSchema(BaseModel):
    modelId: str
    modelFamily: Literal["gesture-recognition", "continuous-authentication"]
    status: Literal["not-trained", "loading", "ready", "degraded", "error"]
    version: str | None = None
    accuracy: float | None = None
    latencyMs: float | None = None
    loadedAt: str | None = None
    errorMessage: str | None = None


class InferenceFrameReferenceSchema(BaseModel):
    capturedAt: str
    frameId: str
    filePath: str | None = None


class GesturePredictionSchema(BaseModel):
    gestureId: str
    label: str
    confidence: float = Field(ge=0, le=1)


class RunGestureInferenceRequestSchema(BaseModel):
    frame: InferenceFrameReferenceSchema
    modelId: str | None = None
    minConfidence: float | None = Field(default=None, ge=0, le=1)


class DetectHandPresenceRequestSchema(BaseModel):
    frame: InferenceFrameReferenceSchema


class InferenceResultSchema(BaseModel):
    id: str
    frameId: str
    modelId: str
    predictions: list[GesturePredictionSchema]
    bestPrediction: GesturePredictionSchema | None = None
    inferenceTimeMs: float
    createdAt: str


class HandPresenceResultSchema(BaseModel):
    frameId: str
    handDetected: bool
    reason: str | None = None
