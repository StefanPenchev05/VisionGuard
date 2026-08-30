import { describe, expect, it } from "vitest";
import type {
  AiModelServiceContract,
  CreateTrainingDatasetRequest,
  HandPresenceResult,
  InferenceResult,
  ModelStatus,
  TrainingDataset,
  TrainingJob
} from "@visionguard/shared-kernel/contracts/ai";

class InMemoryAiModelService implements AiModelServiceContract {
  async createTrainingDataset(request: CreateTrainingDatasetRequest): Promise<TrainingDataset> {
    return {
      createdAt: "2026-08-21T00:00:00.000Z",
      id: "dataset-1",
      labels: request.labels,
      name: request.name,
      sampleCount: request.samples.length,
      updatedAt: "2026-08-21T00:00:00.000Z"
    };
  }

  async detectHandPresence(): Promise<HandPresenceResult> {
    return {
      frameId: "frame-1",
      handDetected: true
    };
  }

  async getModelStatus(): Promise<ModelStatus> {
    return {
      modelFamily: "gesture-recognition",
      modelId: "default",
      status: "ready"
    };
  }

  async getTrainingJob(jobId: string): Promise<TrainingJob> {
    return {
      datasetId: "dataset-1",
      id: jobId,
      modelFamily: "gesture-recognition",
      progress: 1,
      status: "completed"
    };
  }

  async listDatasets(): Promise<TrainingDataset[]> {
    return [];
  }

  async runGestureInference(): Promise<InferenceResult> {
    return {
      createdAt: "2026-08-21T00:00:00.000Z",
      frameId: "frame-1",
      id: "result-1",
      inferenceTimeMs: 12,
      modelId: "default",
      predictions: []
    };
  }

  async trainGestureModel(): Promise<TrainingJob> {
    return {
      datasetId: "dataset-1",
      id: "job-1",
      modelFamily: "gesture-recognition",
      progress: 0,
      status: "queued"
    };
  }
}

describe("AiModelServiceContract", () => {
  it("supports creating a dataset from captured gesture samples", async () => {
    const service = new InMemoryAiModelService();

    const dataset = await service.createTrainingDataset({
      labels: [
        {
          actionTarget: "Safari",
          actionType: "open-app",
          id: "gesture-open-palm",
          name: "Open Palm"
        }
      ],
      name: "Desktop Gestures",
      samples: [
        {
          capturedAt: "2026-08-21T00:00:00.000Z",
          filePath: "/tmp/open-palm.jpg",
          gestureId: "gesture-open-palm",
          id: "sample-1",
          source: "desktop-camera"
        }
      ]
    });

    expect(dataset).toMatchObject({
      id: "dataset-1",
      sampleCount: 1
    });
  });
});
