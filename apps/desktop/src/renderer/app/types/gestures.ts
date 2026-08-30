export type GestureActionType =
  | "open-app"
  | "volume-down"
  | "volume-up"
  | "mute"
  | "keyboard-shortcut"
  | "mouse-click";

export type GestureSample = {
  capturedAt: string;
  filePath: string;
  handDetected?: boolean;
  handDetectionConfidence?: number | null;
  handLandmarkCount?: number | null;
  id: string;
  height?: number;
  width?: number;
};

export type GestureTrainingMetadata = {
  datasetId?: string;
  errorMessage?: string;
  jobId?: string;
  jobProgress?: number;
  jobStatus?: "queued" | "running" | "completed" | "failed" | "cancelled";
  queuedAt?: string;
  updatedAt?: string;
};

export type GestureDefinition = {
  id: string;
  actionTarget: string;
  actionType: GestureActionType;
  confidenceTarget: number;
  createdAt: string;
  description: string;
  name: string;
  sampleFiles: GestureSample[];
  samples: number;
  status: "draft" | "ready" | "training" | "trained" | "training-failed";
  training?: GestureTrainingMetadata;
};
