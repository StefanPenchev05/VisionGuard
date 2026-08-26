from fastapi import FastAPI

from .routes.datasets import router as datasets_router
from .routes.health import router as health_router
from .routes.inference import router as inference_router
from .routes.models import router as models_router
from .routes.training_jobs import router as training_jobs_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="VisionGuard AI Model Service",
        version="0.1.0",
        description="Local AI service for gesture recognition and continuous authentication.",
    )
    app.include_router(health_router)
    app.include_router(datasets_router)
    app.include_router(training_jobs_router)
    app.include_router(models_router)
    app.include_router(inference_router)
    return app


app = create_app()
