from fastapi import APIRouter

from ..schemas.model_contract import (
    CreateTrainingDatasetRequestSchema,
    TrainingDatasetSchema,
)
from ..state import state


router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("", response_model=list[TrainingDatasetSchema])
async def list_datasets() -> list[TrainingDatasetSchema]:
    return state.list_datasets()


@router.post("", response_model=TrainingDatasetSchema, status_code=201)
async def create_dataset(
    request: CreateTrainingDatasetRequestSchema,
) -> TrainingDatasetSchema:
    return state.create_dataset(request)
