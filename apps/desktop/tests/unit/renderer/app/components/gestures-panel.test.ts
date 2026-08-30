import { describe, expect, it } from "vitest";
import { getGestureCaptureInstruction } from "../../../../../src/renderer/app/components/GesturesPanel";

describe("GesturesPanel capture instructions", () => {
  it("asks for the camera before recording starts", () => {
    expect(
      getGestureCaptureInstruction({
        handCaptureStatus: "idle",
        isCameraActive: false,
        isPreviewReady: false,
        lifecycle: "idle"
      })
    ).toEqual({
      detail: "Start camera before recording",
      title: "Camera required"
    });
  });

  it("waits for video readiness after the camera stream starts", () => {
    expect(
      getGestureCaptureInstruction({
        handCaptureStatus: "idle",
        isCameraActive: true,
        isPreviewReady: false,
        lifecycle: "idle"
      })
    ).toEqual({
      detail: "Waiting for the camera image",
      title: "Starting preview"
    });
  });

  it("shows missing-hand feedback while recording", () => {
    expect(
      getGestureCaptureInstruction({
        handCaptureStatus: "missing",
        isCameraActive: true,
        isPreviewReady: true,
        lifecycle: "recording"
      })
    ).toEqual({
      detail: "Show hand",
      title: "Recording paused"
    });
  });

  it("shows completion feedback after all samples are captured", () => {
    expect(
      getGestureCaptureInstruction({
        handCaptureStatus: "detected",
        isCameraActive: true,
        isPreviewReady: true,
        lifecycle: "complete"
      })
    ).toEqual({
      detail: "Review samples, then save the gesture",
      title: "Capture complete"
    });
  });
});
