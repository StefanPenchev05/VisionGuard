from fastapi import APIRouter

from ..schemas.model_contract import ModelStatusSchema
from ..state import state


router = APIRouter(prefix="/models", tags=["models"])


@router.get("/{model_id}/status", response_model=ModelStatusSchema)
async def get_model_status(model_id: str) -> ModelStatusSchema:
    return state.get_model_status(model_id)
