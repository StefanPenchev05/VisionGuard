import { describe, expect, it } from "vitest";
import {
  formatMetricPercent,
  getGestureCaptureInstruction,
  getTrainingReadinessMessage,
  validateHandSampleQuality
} from "../../../../../src/renderer/app/components/GesturesPanel";

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

  it("shows weak-sample feedback while recording", () => {
    expect(
      getGestureCaptureInstruction({
        handCaptureStatus: "weak",
        isCameraActive: true,
        isPreviewReady: true,
        lifecycle: "recording"
      })
    ).toEqual({
      detail: "Move hand closer and keep it fully visible",
      title: "Weak hand sample"
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

describe("validateHandSampleQuality", () => {
  it("rejects frames without a detected hand", () => {
    expect(
      validateHandSampleQuality({
        frameId: "frame-1",
        handDetected: false,
        reason: "No hand landmarks detected in frame."
      })
    ).toEqual({
      message: "No hand landmarks detected in frame.",
      ok: false
    });
  });

  it("rejects low-confidence hand frames", () => {
    expect(
      validateHandSampleQuality({
        confidence: 0.4,
        frameId: "frame-1",
        handDetected: true,
        landmarkCount: 21,
        reason: null
      })
    ).toEqual({
      message: "Hand confidence is 40%. Move hand closer.",
      ok: false
    });
  });

  it("rejects frames with too few landmarks", () => {
    expect(
      validateHandSampleQuality({
        confidence: 0.9,
        frameId: "frame-1",
        handDetected: true,
        landmarkCount: 12,
        reason: null
      })
    ).toEqual({
      message: "Only 12 hand landmarks detected. Show the full hand.",
      ok: false
    });
  });

  it("accepts clear hand frames", () => {
    expect(
      validateHandSampleQuality({
        confidence: 0.9,
        frameId: "frame-1",
        handDetected: true,
        landmarkCount: 21,
        reason: null
      })
    ).toEqual({
      message: null,
      ok: true
    });
  });
});

describe("formatMetricPercent", () => {
  it("formats available and missing training metrics", () => {
    expect(formatMetricPercent(0.916)).toBe("92%");
    expect(formatMetricPercent(null)).toBe("Not available");
    expect(formatMetricPercent(undefined)).toBe("Not available");
  });
});

describe("getTrainingReadinessMessage", () => {
  it("asks for another saved gesture when only one gesture is trainable", () => {
    expect(
      getTrainingReadinessMessage([
        {
          name: "Open Palm",
          sampleFiles: Array.from({ length: 12 }).map(() => ({
            capturedAt: "2026-08-30T00:00:00.000Z",
            filePath: "/tmp/sample.jpg",
            id: "sample"
          }))
        }
      ])
    ).toBe("Record and save 1 more gesture with 12 samples each before training.");
  });

  it("shows how many samples an incomplete gesture still needs", () => {
    expect(
      getTrainingReadinessMessage([
        {
          name: "Open Palm",
          sampleFiles: Array.from({ length: 12 }).map(() => ({
            capturedAt: "2026-08-30T00:00:00.000Z",
            filePath: "/tmp/open-palm.jpg",
            id: "open-palm-sample"
          }))
        },
        {
          name: "Closed Fist",
          sampleFiles: Array.from({ length: 9 }).map(() => ({
            capturedAt: "2026-08-30T00:00:00.000Z",
            filePath: "/tmp/closed-fist.jpg",
            id: "closed-fist-sample"
          }))
        }
      ])
    ).toBe("Closed Fist needs 3 more saved samples. The model needs 2 gestures with 12 samples each.");
  });

  it("returns no message when two gestures are trainable", () => {
    const sampleFiles = Array.from({ length: 12 }).map(() => ({
      capturedAt: "2026-08-30T00:00:00.000Z",
      filePath: "/tmp/sample.jpg",
      id: "sample"
    }));

    expect(
      getTrainingReadinessMessage([
        { name: "Open Palm", sampleFiles },
        { name: "Closed Fist", sampleFiles }
      ])
    ).toBeNull();
  });
});
