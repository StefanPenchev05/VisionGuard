from __future__ import annotations

import os
import threading
from datetime import UTC, datetime
from pathlib import Path
from time import perf_counter
from uuid import uuid4

from application.training.gesture_training_worker import (
    detect_hand_presence,
    inspect_hand_presence,
    load_model_artifact,
    predict_gesture,
    train_gesture_model,
)
from .schemas.model_contract import (
    CreateTrainingDatasetRequestSchema,
    DetectHandPresenceRequestSchema,
    HandPresenceResultSchema,
    InferenceResultSchema,
    ModelStatusSchema,
    RunGestureInferenceRequestSchema,
    TrainGestureModelRequestSchema,
    TrainingDatasetSchema,
    TrainingJobSchema,
)


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


class InMemoryAiServiceState:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.datasets: dict[str, TrainingDatasetSchema] = {}
        self.dataset_samples: dict[str, list] = {}
        self.training_jobs: dict[str, TrainingJobSchema] = {}
        self.active_model: ModelStatusSchema | None = None
        self.model_artifact_path: str | None = None

    def reset(self) -> None:
        with self.lock:
            self.datasets.clear()
            self.dataset_samples.clear()
            self.training_jobs.clear()
            self.active_model = None
            self.model_artifact_path = None

    def create_dataset(
        self, request: CreateTrainingDatasetRequestSchema
    ) -> TrainingDatasetSchema:
        now = utc_now()
        dataset = TrainingDatasetSchema(
            id=f"dataset-{uuid4()}",
            name=request.name,
            labels=request.labels,
            sampleCount=len(request.samples),
            createdAt=now,
            updatedAt=now,
        )
        with self.lock:
            self.datasets[dataset.id] = dataset
            self.dataset_samples[dataset.id] = list(request.samples)
        return dataset

    def list_datasets(self) -> list[TrainingDatasetSchema]:
        with self.lock:
            return list(self.datasets.values())

    def create_training_job(
        self, request: TrainGestureModelRequestSchema
    ) -> TrainingJobSchema | None:
        with self.lock:
            if request.datasetId not in self.datasets:
                return None

            job = TrainingJobSchema(
                id=f"job-{uuid4()}",
                datasetId=request.datasetId,
                status="queued",
                progress=0,
            )
            self.training_jobs[job.id] = job

        worker = threading.Thread(
            target=self._run_training_job,
            args=(job.id,),
            daemon=True,
            name=f"visionguard-training-{job.id}",
        )
        worker.start()
        return job

    def get_training_job(self, job_id: str) -> TrainingJobSchema | None:
        with self.lock:
            return self.training_jobs.get(job_id)

    def get_model_status(self, model_id: str) -> ModelStatusSchema:
        with self.lock:
            if self.active_model and self.active_model.modelId == model_id:
                return self.active_model

        return ModelStatusSchema(
            modelId=model_id,
            modelFamily="gesture-recognition",
            status="not-trained",
        )

    def run_gesture_inference(
        self, request: RunGestureInferenceRequestSchema
    ) -> InferenceResultSchema:
        started_at = perf_counter()
        model_id = request.modelId or "default"

        with self.lock:
            artifact_path = self.model_artifact_path

        predictions = []
        if artifact_path and request.frame.filePath:
            artifact = load_model_artifact(artifact_path)
            if artifact.get("modelId") == model_id:
                predictions = predict_gesture(
                    artifact,
                    request.frame.filePath,
                    request.minConfidence,
                )

        return InferenceResultSchema(
            id=f"inference-{uuid4()}",
            frameId=request.frame.frameId,
            modelId=model_id,
            predictions=predictions,
            bestPrediction=predictions[0] if predictions else None,
            inferenceTimeMs=round((perf_counter() - started_at) * 1000, 3),
            createdAt=utc_now(),
        )

    def detect_hand_presence(
        self, request: DetectHandPresenceRequestSchema
    ) -> HandPresenceResultSchema:
        hand_detected = False
        reason = "Frame file is missing."
        confidence = None
        landmark_count = None
        bounding_box = None

        if request.frame.filePath:
            detection = inspect_hand_presence(request.frame.filePath)
            hand_detected = detection.hand_detected
            reason = detection.reason
            confidence = detection.confidence
            landmark_count = detection.landmark_count
            bounding_box = detection.bounding_box

        return HandPresenceResultSchema(
            boundingBox=bounding_box,
            confidence=confidence,
            frameId=request.frame.frameId,
            handDetected=hand_detected,
            landmarkCount=landmark_count,
            reason=reason,
        )

    def _set_job(
        self,
        job_id: str,
        *,
        completed_at: str | None = None,
        error_message: str | None = None,
        metrics: dict | None = None,
        model_artifact_path: str | None = None,
        progress: float,
        started_at: str | None = None,
        status: str,
    ) -> None:
        with self.lock:
            current = self.training_jobs[job_id]
            self.training_jobs[job_id] = TrainingJobSchema(
                id=current.id,
                datasetId=current.datasetId,
                modelFamily=current.modelFamily,
                status=status,
                progress=progress,
                startedAt=started_at if started_at is not None else current.startedAt,
                completedAt=completed_at,
                modelArtifactPath=model_artifact_path,
                errorMessage=error_message,
                metrics=metrics if metrics is not None else current.metrics,
            )

    def _run_training_job(self, job_id: str) -> None:
        started_at = utc_now()
        self._set_job(job_id, progress=0.1, started_at=started_at, status="running")

        with self.lock:
            job = self.training_jobs[job_id]
            dataset = self.datasets[job.datasetId]
            samples = list(self.dataset_samples[job.datasetId])

        try:
            artifact_directory = Path(
                os.environ.get(
                    "VISIONGUARD_AI_MODEL_DIR",
                    str(Path.home() / ".visionguard" / "models"),
                )
            )
            self._set_job(job_id, progress=0.45, status="running")
            model = train_gesture_model(dataset, samples, artifact_directory)
            completed_at = utc_now()

            with self.lock:
                self.model_artifact_path = model.artifact_path
                self.active_model = ModelStatusSchema(
                    accuracy=model.accuracy,
                    latencyMs=None,
                    loadedAt=completed_at,
                    modelFamily="gesture-recognition",
                    modelId=model.model_id,
                    status="ready",
                    version=model.version,
                )

            self._set_job(
                job_id,
                completed_at=completed_at,
                metrics=model.metrics,
                model_artifact_path=model.artifact_path,
                progress=1,
                status="completed",
            )
        except Exception as error:
            self._set_job(
                job_id,
                completed_at=utc_now(),
                error_message=str(error),
                progress=1,
                status="failed",
            )


state = InMemoryAiServiceState()
