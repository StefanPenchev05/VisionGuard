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
