export type GestureActionType =
  | "open-app"
  | "volume-down"
  | "volume-up"
  | "mute"
  | "keyboard-shortcut"
  | "mouse-click";

export type GestureDefinition = {
  id: string;
  actionTarget: string;
  actionType: GestureActionType;
  confidenceTarget: number;
  createdAt: string;
  description: string;
  name: string;
  samples: number;
  status: "draft" | "ready" | "training";
};
