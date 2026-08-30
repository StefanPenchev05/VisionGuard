import type {
  AiModelServiceContract,
  CreateTrainingDatasetRequest,
  DetectHandPresenceRequest,
  HandPresenceResult,
  InferenceResult,
  ModelStatus,
  RunGestureInferenceRequest,
  TrainingDataset,
  TrainingJob,
  TrainGestureModelRequest
} from "@visionguard/shared-kernel/contracts/ai";

export type AiModelClientConfig = {
  baseUrl: string;
  requestTimeoutMs?: number;
};

export class AiModelClientError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "AiModelClientError";
  }
}

async function requestJson<TResponse>(
  config: AiModelClientConfig,
  path: string,
  init?: RequestInit
): Promise<TResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.requestTimeoutMs ?? 10_000
  );

  try {
    const response = await fetch(new URL(path, config.baseUrl), {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init?.headers
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new AiModelClientError(`AI service request failed: ${response.statusText}`, response.status);
    }

    return (await response.json()) as TResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

export class HttpAiModelClient implements AiModelServiceContract {
  constructor(private readonly config: AiModelClientConfig) {}

  createTrainingDataset(request: CreateTrainingDatasetRequest): Promise<TrainingDataset> {
    return requestJson(this.config, "/datasets", {
      body: JSON.stringify(request),
      method: "POST"
    });
  }

  detectHandPresence(request: DetectHandPresenceRequest): Promise<HandPresenceResult> {
    return requestJson(this.config, "/inference/hand-presence", {
      body: JSON.stringify(request),
      method: "POST"
    });
  }

  getModelStatus(modelId = "default"): Promise<ModelStatus> {
    return requestJson(this.config, `/models/${modelId}/status`);
  }

  getTrainingJob(jobId: string): Promise<TrainingJob> {
    return requestJson(this.config, `/training-jobs/${jobId}`);
  }

  listDatasets(): Promise<TrainingDataset[]> {
    return requestJson(this.config, "/datasets");
  }

  runGestureInference(request: RunGestureInferenceRequest): Promise<InferenceResult> {
    return requestJson(this.config, "/inference/gesture", {
      body: JSON.stringify(request),
      method: "POST"
    });
  }

  trainGestureModel(request: TrainGestureModelRequest): Promise<TrainingJob> {
    return requestJson(this.config, "/training-jobs", {
      body: JSON.stringify(request),
      method: "POST"
    });
  }
}
