import { describe, expect, it, vi } from "vitest";
import { startGestureTraining } from "../../../../../src/main/application/training/start-gesture-training";
import type {
  CreateTrainingDatasetRequest,
  TrainGestureModelRequest,
  TrainingDataset,
  TrainingJob
} from "@visionguard/shared-kernel/contracts/ai";

function buildGesture(sampleCount = 12) {
  return {
    actionTarget: "Safari",
    actionType: "open-app",
    id: "gesture-open-palm",
    name: "Open Palm",
    sampleFiles: Array.from({ length: sampleCount }).map((_, index) => ({
      capturedAt: "2026-08-21T00:00:00.000Z",
      filePath: `/tmp/sample-${index + 1}.jpg`,
      handDetected: true,
      handDetectionConfidence: 0.9,
      handLandmarkCount: 21,
      height: 720,
      id: `sample-${index + 1}`,
      width: 1280
    }))
  };
}

describe("startGestureTraining", () => {
  it("creates a dataset from saved gesture sample files and starts a training job", async () => {
    const createTrainingDataset = vi
      .fn(async (_request: CreateTrainingDatasetRequest): Promise<TrainingDataset> => ({
        createdAt: "2026-08-21T00:00:00.000Z",
        id: "dataset-1",
        labels: [],
        name: "Open Palm Gesture Dataset",
        sampleCount: 12,
        updatedAt: "2026-08-21T00:00:00.000Z"
      }));
    const trainGestureModel = vi
      .fn(async (_request: TrainGestureModelRequest): Promise<TrainingJob> => ({
        datasetId: "dataset-1",
        id: "job-1",
        modelFamily: "gesture-recognition",
        progress: 0,
        status: "queued"
      }));

    await expect(
      startGestureTraining(buildGesture(), {
        createTrainingDataset,
        trainGestureModel
      })
    ).resolves.toMatchObject({
      dataset: { id: "dataset-1" },
      job: { id: "job-1", status: "queued" }
    });

    expect(createTrainingDataset).toHaveBeenCalledWith({
      labels: [
        {
          actionTarget: "Safari",
          actionType: "open-app",
          id: "gesture-open-palm",
          name: "Open Palm"
        }
      ],
      name: "Open Palm Gesture Dataset",
      samples: expect.arrayContaining([
        expect.objectContaining({
          filePath: "/tmp/sample-1.jpg",
          gestureId: "gesture-open-palm",
          handDetected: true,
          handDetectionConfidence: 0.9,
          handLandmarkCount: 21,
          height: 720,
          width: 1280,
          source: "desktop-camera"
        })
      ])
    });
    expect(trainGestureModel).toHaveBeenCalledWith({
      datasetId: "dataset-1",
      modelConfig: {
        batchSize: 8,
        epochs: 20,
        learningRate: 0.001
      }
    });
  });

  it("rejects gestures without enough saved sample files", async () => {
    await expect(startGestureTraining(buildGesture(11), {
      createTrainingDataset: vi.fn(),
      trainGestureModel: vi.fn()
    })).rejects.toThrow("Gesture needs at least 12 saved samples before training.");
  });
});
