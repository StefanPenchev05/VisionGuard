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
  id: string;
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
  status: "draft" | "ready" | "training";
};
