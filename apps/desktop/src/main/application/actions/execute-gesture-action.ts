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

const supportedActionTypes: ReadonlySet<GestureActionRequest["actionType"]> = new Set([
  "keyboard-shortcut",
  "mouse-click",
  "mute",
  "open-app",
  "volume-down",
  "volume-up"
]);

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

  if (!supportedActionTypes.has(request.actionType as GestureActionRequest["actionType"])) {
    throw new TypeError(`Unsupported gesture action type: ${request.actionType}`);
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

export function buildVolumeAdjustmentScript(delta: number): string[] {
  const operation = delta >= 0 ? "+" : "-";
  const amount = Math.abs(delta);

  return [
    "set currentVolume to output volume of (get volume settings)",
    `set nextVolume to currentVolume ${operation} ${amount}`,
    "if nextVolume < 0 then set nextVolume to 0",
    "if nextVolume > 100 then set nextVolume to 100",
    "set volume output volume nextVolume",
    "return nextVolume"
  ];
}

function buildMuteToggleScript(): string[] {
  return [
    "set isMuted to output muted of (get volume settings)",
    "if isMuted then",
    "set volume without output muted",
    "return \"unmuted\"",
    "else",
    "set volume with output muted",
    "return \"muted\"",
    "end if"
  ];
}

async function runAppleScript(lines: string[]): Promise<string> {
  const { stdout } = await execFileAsync(
    "osascript",
    lines.flatMap((line) => ["-e", line])
  );

  return stdout.trim();
}

async function executeOnMac(request: GestureActionRequest): Promise<string> {
  if (request.actionType === "open-app") {
    await execFileAsync("open", ["-a", request.actionTarget]);
    return `Opened ${request.actionTarget}`;
  }

  if (request.actionType === "volume-down") {
    const nextVolume = await runAppleScript(buildVolumeAdjustmentScript(-10));
    return `Reduced system volume to ${nextVolume}%`;
  }

  if (request.actionType === "volume-up") {
    const nextVolume = await runAppleScript(buildVolumeAdjustmentScript(10));
    return `Increased system volume to ${nextVolume}%`;
  }

  if (request.actionType === "mute") {
    const muteState = await runAppleScript(buildMuteToggleScript());
    return `Audio ${muteState}`;
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
