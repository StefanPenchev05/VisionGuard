import { describe, expect, it } from "vitest";
import {
  buildShortcutScript,
  buildVolumeAdjustmentScript,
  executeGestureAction,
  formatGestureActionError
} from "../../../../../src/main/application/actions/execute-gesture-action";

describe("execute-gesture-action", () => {
  it("builds clamped volume adjustment AppleScript", () => {
    expect(buildVolumeAdjustmentScript(-10)).toEqual([
      "set currentVolume to output volume of (get volume settings)",
      "set nextVolume to currentVolume - 10",
      "if nextVolume < 0 then set nextVolume to 0",
      "if nextVolume > 100 then set nextVolume to 100",
      "set volume output volume nextVolume",
      "return nextVolume"
    ]);

    expect(buildVolumeAdjustmentScript(10)[1]).toBe("set nextVolume to currentVolume + 10");
  });

  it("rejects unsupported action types before execution", async () => {
    await expect(
      executeGestureAction({
        actionTarget: "Safari",
        actionType: "bad-action",
        gestureId: "gesture-1"
      })
    ).rejects.toThrow("Unsupported gesture action type: bad-action");
  });

  it("builds validated keyboard shortcut AppleScript", () => {
    expect(buildShortcutScript("Cmd+Shift+K")).toBe(
      'tell application "System Events" to keystroke "k" using {command down, shift down}'
    );
  });

  it("rejects unsupported keyboard shortcut modifiers", () => {
    expect(() => buildShortcutScript("Meta+K")).toThrow("Unsupported keyboard modifier: meta");
  });

  it("rejects invalid keyboard shortcut keys", () => {
    expect(() => buildShortcutScript("Cmd+Launch Safari")).toThrow(
      "Keyboard shortcut target is invalid."
    );
  });

  it("formats missing app action failures", () => {
    const error = new Error("Unable to find application named DefinitelyMissingApp");

    expect(
      formatGestureActionError(error, {
        actionTarget: "DefinitelyMissingApp",
        actionType: "open-app",
        gestureId: "gesture-1"
      })
    ).toBe('Application "DefinitelyMissingApp" was not found.');
  });

  it("formats macOS accessibility failures", () => {
    const error = Object.assign(new Error("osascript failed"), {
      stderr: "System Events got an error: Not authorized to send Apple events."
    });

    expect(
      formatGestureActionError(error, {
        actionTarget: "Cmd+Space",
        actionType: "keyboard-shortcut",
        gestureId: "gesture-1"
      })
    ).toBe("macOS Accessibility permission is required for this action.");
  });
});
