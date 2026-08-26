import type {
  InferenceResult,
  TrainingDataset,
  TrainingJob
} from "@visionguard/shared-kernel/contracts/ai";
import type { GestureActionType, GestureDefinition, GestureSample } from "../../app/types/gestures";

type CapturedGestureSample = {
  capturedAt: string;
  dataUrl: string;
  id: string;
};

declare global {
  interface Window {
    visionGuard?: {
      appName: string;
      gestures: {
        load: () => Promise<GestureDefinition[] | null>;
        save: (gestures: GestureDefinition[]) => Promise<{ count: number }>;
      };
      samples: {
        saveBatch: (
          gestureId: string,
          samples: CapturedGestureSample[]
        ) => Promise<GestureSample[]>;
      };
      inference: {
        runGestureFrame: (frame: {
          capturedAt: string;
          dataUrl: string;
          frameId: string;
          minConfidence?: number;
          modelId?: string;
        }) => Promise<InferenceResult>;
      };
      actions: {
        executeGesture: (action: {
          actionTarget: string;
          actionType: GestureActionType;
          gestureId: string;
        }) => Promise<{
          executedAt: string;
          gestureId: string;
          message: string;
          ok: boolean;
        }>;
      };
      training: {
        getJob: (jobId: string) => Promise<TrainingJob>;
        startGesture: (gesture: GestureDefinition) => Promise<{
          dataset: TrainingDataset;
          job: TrainingJob;
        }>;
      };
    };
  }
}

export {};
