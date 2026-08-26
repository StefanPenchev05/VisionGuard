from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from .schemas.model_contract import (
    CreateTrainingDatasetRequestSchema,
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
        self.datasets: dict[str, TrainingDatasetSchema] = {}
        self.training_jobs: dict[str, TrainingJobSchema] = {}

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
        self.datasets[dataset.id] = dataset
        return dataset

    def list_datasets(self) -> list[TrainingDatasetSchema]:
        return list(self.datasets.values())

    def create_training_job(
        self, request: TrainGestureModelRequestSchema
    ) -> TrainingJobSchema | None:
        if request.datasetId not in self.datasets:
            return None

        job = TrainingJobSchema(
            id=f"job-{uuid4()}",
            datasetId=request.datasetId,
            status="queued",
            progress=0,
        )
        self.training_jobs[job.id] = job
        return job

    def get_training_job(self, job_id: str) -> TrainingJobSchema | None:
        return self.training_jobs.get(job_id)

    def get_model_status(self, model_id: str) -> ModelStatusSchema:
        has_completed_job = any(
            job.status == "completed" for job in self.training_jobs.values()
        )
        return ModelStatusSchema(
            modelId=model_id,
            modelFamily="gesture-recognition",
            status="ready" if has_completed_job else "not-trained",
        )

    def run_gesture_inference(
        self, request: RunGestureInferenceRequestSchema
    ) -> InferenceResultSchema:
        return InferenceResultSchema(
            id=f"inference-{uuid4()}",
            frameId=request.frame.frameId,
            modelId=request.modelId or "default",
            predictions=[],
            bestPrediction=None,
            inferenceTimeMs=0,
            createdAt=utc_now(),
        )


state = InMemoryAiServiceState()
