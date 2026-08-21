import type { GestureDefinition } from "../../app/types/gestures";

declare global {
  interface Window {
    visionGuard?: {
      appName: string;
      gestures: {
        load: () => Promise<GestureDefinition[] | null>;
        save: (gestures: GestureDefinition[]) => Promise<{ count: number }>;
      };
    };
  }
}

export {};
