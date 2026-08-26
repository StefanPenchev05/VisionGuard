import type { TrainingDataset, TrainingJob } from "@visionguard/shared-kernel/contracts/ai";
import type { GestureDefinition, GestureSample } from "../../app/types/gestures";

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
      training: {
        startGesture: (gesture: GestureDefinition) => Promise<{
          dataset: TrainingDataset;
          job: TrainingJob;
        }>;
      };
    };
  }
}

export {};
