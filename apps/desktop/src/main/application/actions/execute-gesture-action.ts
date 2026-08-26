import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type GestureActionRequest = {
  actionTarget: string;
  actionType:
    | "open-app"
    | "volume-down"
    | "volume-up"
    | "mute"
    | "keyboard-shortcut"
    | "mouse-click";
  gestureId: string;
};

type GestureActionResult = {
  executedAt: string;
  gestureId: string;
  message: string;
  ok: boolean;
};

function parseRequest(value: unknown): GestureActionRequest {
  const request = value as Partial<GestureActionRequest>;

  if (
    !request ||
    typeof request.gestureId !== "string" ||
    typeof request.actionType !== "string" ||
    typeof request.actionTarget !== "string" ||
    request.actionTarget.trim().length === 0
  ) {
    throw new TypeError("Gesture action payload is invalid.");
  }

  return {
    actionTarget: request.actionTarget.trim(),
    actionType: request.actionType,
    gestureId: request.gestureId
  } as GestureActionRequest;
}

function normalizeKeyToken(value: string): string {
  return value.trim().toLowerCase().replace(/^cmd$/, "command");
}

function buildShortcutScript(shortcut: string): string {
  const tokens = shortcut.split("+").map(normalizeKeyToken).filter(Boolean);
  const key = tokens[tokens.length - 1];
  const modifiers = tokens.slice(0, -1);
  const modifierMap: Record<string, string> = {
    alt: "option down",
    command: "command down",
    ctrl: "control down",
    option: "option down",
    shift: "shift down"
  };
  const using = modifiers
    .map((modifier) => modifierMap[modifier])
    .filter(Boolean);

  if (!key) {
    throw new TypeError("Keyboard shortcut target is invalid.");
  }

  return using.length > 0
    ? `tell application "System Events" to keystroke "${key}" using {${using.join(", ")}}`
    : `tell application "System Events" to keystroke "${key}"`;
}

async function executeOnMac(request: GestureActionRequest): Promise<string> {
  if (request.actionType === "open-app") {
    await execFileAsync("open", ["-a", request.actionTarget]);
    return `Opened ${request.actionTarget}`;
  }

  if (request.actionType === "volume-down") {
    await execFileAsync("osascript", ["-e", "set volume output volume ((output volume of (get volume settings)) - 10)"]);
    return "Reduced system volume";
  }

  if (request.actionType === "volume-up") {
    await execFileAsync("osascript", ["-e", "set volume output volume ((output volume of (get volume settings)) + 10)"]);
    return "Increased system volume";
  }

  if (request.actionType === "mute") {
    await execFileAsync("osascript", ["-e", "set volume with output muted not (output muted of (get volume settings))"]);
    return "Toggled system mute";
  }

  if (request.actionType === "keyboard-shortcut") {
    await execFileAsync("osascript", ["-e", buildShortcutScript(request.actionTarget)]);
    return `Sent ${request.actionTarget}`;
  }

  await execFileAsync("osascript", ["-e", "tell application \"System Events\" to click"]);
  return "Sent primary click";
}

export async function executeGestureAction(value: unknown): Promise<GestureActionResult> {
  const request = parseRequest(value);

  try {
    if (process.platform !== "darwin") {
      throw new Error("Gesture actions are currently implemented for macOS.");
    }

    const message = await executeOnMac(request);

    return {
      executedAt: new Date().toISOString(),
      gestureId: request.gestureId,
      message,
      ok: true
    };
  } catch (error) {
    return {
      executedAt: new Date().toISOString(),
      gestureId: request.gestureId,
      message: error instanceof Error ? error.message : "Could not execute gesture action.",
      ok: false
    };
  }
}
