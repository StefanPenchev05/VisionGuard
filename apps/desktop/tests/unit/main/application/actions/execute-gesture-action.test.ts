import { describe, expect, it } from "vitest";
import { buildVolumeAdjustmentScript } from "../../../../../src/main/application/actions/execute-gesture-action";

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
});
