import type {
  GestureLabel,
  GestureSampleReference,
  TrainingDataset,
  TrainingJob
} from "@visionguard/shared-kernel/contracts/ai";
import { HttpAiModelClient } from "../../infrastructure/ai-client";
import { getAiServiceBaseUrl } from "../../infrastructure/settings/app-settings-store";

type DesktopGestureSample = {
  capturedAt: string;
  filePath: string;
  handDetected?: boolean;
  handDetectionConfidence?: number | null;
  handLandmarkCount?: number | null;
  height?: number;
  id: string;
  width?: number;
};

type DesktopGestureForTraining = GestureLabel & {
  sampleFiles: DesktopGestureSample[];
};

export type StartGestureTrainingResult = {
  dataset: TrainingDataset;
  job: TrainingJob;
};

type GestureTrainingClient = {
  createTrainingDataset: InstanceType<typeof HttpAiModelClient>["createTrainingDataset"];
  trainGestureModel: InstanceType<typeof HttpAiModelClient>["trainGestureModel"];
};

const minimumTrainingSamples = 12;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseDesktopGesture(value: unknown): DesktopGestureForTraining {
  if (!value || typeof value !== "object") {
    throw new TypeError("Gesture training payload is invalid.");
  }

  const gesture = value as Partial<DesktopGestureForTraining>;

  if (
    !isNonEmptyString(gesture.id) ||
    !isNonEmptyString(gesture.name) ||
    !isNonEmptyString(gesture.actionType) ||
    !isNonEmptyString(gesture.actionTarget) ||
    !Array.isArray(gesture.sampleFiles)
  ) {
    throw new TypeError("Gesture training payload is missing required fields.");
  }

  if (gesture.sampleFiles.length < minimumTrainingSamples) {
    throw new TypeError("Gesture needs at least 12 saved samples before training.");
  }

  const sampleFiles = gesture.sampleFiles.map((sample) => {
    if (
      !sample ||
      typeof sample !== "object" ||
      !isNonEmptyString(sample.id) ||
      !isNonEmptyString(sample.capturedAt) ||
      !isNonEmptyString(sample.filePath)
    ) {
      throw new TypeError("Gesture training samples must reference saved files.");
    }

    return {
      capturedAt: sample.capturedAt,
      filePath: sample.filePath,
      handDetected: sample.handDetected,
      handDetectionConfidence: sample.handDetectionConfidence,
      handLandmarkCount: sample.handLandmarkCount,
      height: sample.height,
      id: sample.id,
      width: sample.width
    };
  });

  return {
    actionTarget: gesture.actionTarget,
    actionType: gesture.actionType,
    id: gesture.id,
    name: gesture.name,
    sampleFiles
  } as DesktopGestureForTraining;
}

function buildSampleReferences(gesture: DesktopGestureForTraining): GestureSampleReference[] {
  return gesture.sampleFiles.map((sample) => ({
    capturedAt: sample.capturedAt,
    filePath: sample.filePath,
    gestureId: gesture.id,
    handDetected: sample.handDetected,
    handDetectionConfidence: sample.handDetectionConfidence,
    handLandmarkCount: sample.handLandmarkCount,
    height: sample.height,
    id: sample.id,
    source: "desktop-camera",
    width: sample.width
  }));
}

export async function startGestureTraining(
  gesturePayload: unknown,
  client?: GestureTrainingClient
): Promise<StartGestureTrainingResult> {
  const gesture = parseDesktopGesture(gesturePayload);
  const aiClient = client ?? new HttpAiModelClient({
    baseUrl: await getAiServiceBaseUrl(),
    requestTimeoutMs: 10_000
  });
  const label: GestureLabel = {
    actionTarget: gesture.actionTarget,
    actionType: gesture.actionType,
    id: gesture.id,
    name: gesture.name
  };

  const dataset = await aiClient.createTrainingDataset({
    labels: [label],
    name: `${gesture.name} Gesture Dataset`,
    samples: buildSampleReferences(gesture)
  });
  const job = await aiClient.trainGestureModel({
    datasetId: dataset.id,
    modelConfig: {
      batchSize: 8,
      epochs: 20,
      learningRate: 0.001
    }
  });

  return { dataset, job };
}
