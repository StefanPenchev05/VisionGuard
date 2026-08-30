import { describe, expect, it } from "vitest";
import {
  buildCameraConstraints,
  getCameraErrorMessage
} from "../../../../../src/renderer/shared/hooks/useCameraStream";

describe("useCameraStream helpers", () => {
  it("builds default HD video constraints without audio", () => {
    expect(buildCameraConstraints(null)).toEqual({
      audio: false,
      video: {
        frameRate: { ideal: 30 },
        height: { ideal: 1080 },
        width: { ideal: 1920 }
      }
    });
  });

  it("pins the requested camera when a device id is selected", () => {
    expect(buildCameraConstraints("camera-1")).toEqual({
      audio: false,
      video: {
        deviceId: { exact: "camera-1" },
        frameRate: { ideal: 30 },
        height: { ideal: 1080 },
        width: { ideal: 1920 }
      }
    });
  });

  it("maps common camera errors to user-facing messages", () => {
    expect(getCameraErrorMessage(new DOMException("", "NotAllowedError"))).toBe(
      "Camera permission was denied."
    );
    expect(getCameraErrorMessage(new DOMException("", "NotFoundError"))).toBe(
      "No camera was found."
    );
    expect(getCameraErrorMessage(new DOMException("", "NotReadableError"))).toBe(
      "Camera is already in use by another app."
    );
  });
});
