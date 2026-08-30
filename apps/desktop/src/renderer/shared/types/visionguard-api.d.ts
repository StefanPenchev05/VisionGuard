import type {
  HandPresenceResult,
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
      settings: {
        load: () => Promise<{
          aiServiceUrl: string;
        }>;
        save: (settings: { aiServiceUrl: string }) => Promise<{
          aiServiceUrl: string;
        }>;
      };
      gestures: {
        load: () => Promise<GestureDefinition[] | null>;
        save: (gestures: GestureDefinition[]) => Promise<{ count: number }>;
      };
      samples: {
        deleteGesture: (gestureId: string) => Promise<{ deleted: boolean }>;
        saveBatch: (
          gestureId: string,
          samples: CapturedGestureSample[]
        ) => Promise<GestureSample[]>;
      };
      inference: {
        detectHandFrame: (frame: {
          capturedAt: string;
          dataUrl: string;
          frameId: string;
        }) => Promise<HandPresenceResult>;
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
      aiService: {
        getStatus: () => Promise<{
          checkedAt: string;
          errorMessage?: string;
          modelStatus?: {
            modelId: string;
            modelFamily: "gesture-recognition" | "continuous-authentication";
            status: "not-trained" | "loading" | "ready" | "degraded" | "error";
            version?: string;
            accuracy?: number;
            latencyMs?: number;
            loadedAt?: string;
            errorMessage?: string;
          };
          ok: boolean;
          serviceUrl: string;
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
