from fastapi import APIRouter, HTTPException

from ..schemas.model_contract import TrainGestureModelRequestSchema, TrainingJobSchema
from ..state import state


router = APIRouter(prefix="/training-jobs", tags=["training"])


@router.post("", response_model=TrainingJobSchema, status_code=201)
async def create_training_job(
    request: TrainGestureModelRequestSchema,
) -> TrainingJobSchema:
    job = state.create_training_job(request)

    if job is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    return job


@router.get("/{job_id}", response_model=TrainingJobSchema)
async def get_training_job(job_id: str) -> TrainingJobSchema:
    job = state.get_training_job(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Training job not found.")

    return job
