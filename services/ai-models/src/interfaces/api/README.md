# AI Model Service API

This folder owns the service-side boundary that the Electron desktop app will call.

The canonical cross-app contract lives in:

`packages/shared-kernel/src/contracts/ai`

The Python `AiModelServiceContract` mirrors that contract for the future AI service implementation.
Keep these responsibilities separate:

- `interfaces/api`: request/response contracts and API-facing protocol
- `application/training`: training orchestration use cases
- `application/inference`: inference use cases
- `infrastructure/ml-frameworks`: TensorFlow/PyTorch/OpenCV implementation details
- `infrastructure/storage`: model artifact and dataset storage

## Local API Skeleton

Run the current API skeleton from `services/ai-models`:

```bash
python -m pip install -e ".[dev]"
visionguard-ai-api
```

Initial health check:

```bash
curl http://127.0.0.1:8765/health
```

Implemented skeleton routes:

```text
GET  /health
GET  /datasets
POST /datasets
POST /training-jobs
GET  /training-jobs/{job_id}
GET  /models/{model_id}/status
POST /inference/gesture
```

These routes use in-memory state for now. They validate request/response shapes and prepare
the desktop-to-AI integration path, but they do not train or run a real model yet.
