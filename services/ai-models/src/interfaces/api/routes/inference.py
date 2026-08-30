from fastapi import APIRouter

from ..schemas.model_contract import (
    DetectHandPresenceRequestSchema,
    HandPresenceResultSchema,
    InferenceResultSchema,
    RunGestureInferenceRequestSchema,
)
from ..state import state


router = APIRouter(prefix="/inference", tags=["inference"])


@router.post("/gesture", response_model=InferenceResultSchema)
async def run_gesture_inference(
    request: RunGestureInferenceRequestSchema,
) -> InferenceResultSchema:
    return state.run_gesture_inference(request)


@router.post("/hand-presence", response_model=HandPresenceResultSchema)
async def detect_hand_presence(
    request: DetectHandPresenceRequestSchema,
) -> HandPresenceResultSchema:
    return state.detect_hand_presence(request)
