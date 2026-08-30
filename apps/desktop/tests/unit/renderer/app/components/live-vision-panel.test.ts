import { describe, expect, it } from "vitest";
import { getLiveActionStatusLabel } from "../../../../../src/renderer/app/components/LiveVisionPanel";

describe("getLiveActionStatusLabel", () => {
  it("shows the detailed blocked-action reason when a prediction exists but actions are disarmed", () => {
    expect(
      getLiveActionStatusLabel({
        actionMessage: "Actions disarmed - predictions only",
        actionsArmed: false,
        hasPrediction: true
      })
    ).toBe("Actions disarmed - predictions only");
  });

  it("shows the simple disarmed state before any prediction exists", () => {
    expect(
      getLiveActionStatusLabel({
        actionMessage: "Actions disarmed",
        actionsArmed: false,
        hasPrediction: false
      })
    ).toBe("Disarmed");
  });

  it("shows execution messages when actions are armed", () => {
    expect(
      getLiveActionStatusLabel({
        actionMessage: "Opened Safari",
        actionsArmed: true,
        hasPrediction: true
      })
    ).toBe("Opened Safari");
  });
});
