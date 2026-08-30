import { describe, expect, it } from "vitest";
import {
  buildCameraConstraints,
  getCameraErrorMessage,
  getCameraStatusLabel
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

  it("reports unsupported camera runtime before device state", () => {
    expect(
      getCameraStatusLabel({
        deviceCount: 1,
        errorMessage: null,
        isSupported: false,
        permissionState: "unknown",
        status: "idle"
      })
    ).toBe("Unsupported");
  });

  it("reports active and connecting camera states", () => {
    expect(
      getCameraStatusLabel({
        deviceCount: 1,
        errorMessage: null,
        isSupported: true,
        permissionState: "granted",
        status: "requesting"
      })
    ).toBe("Connecting");

    expect(
      getCameraStatusLabel({
        deviceCount: 1,
        errorMessage: null,
        isSupported: true,
        permissionState: "granted",
        status: "active"
      })
    ).toBe("Connected");
  });

  it("reports permission and missing-device idle states", () => {
    expect(
      getCameraStatusLabel({
        deviceCount: 1,
        errorMessage: null,
        isSupported: true,
        permissionState: "denied",
        status: "idle"
      })
    ).toBe("Permission denied");

    expect(
      getCameraStatusLabel({
        deviceCount: 0,
        errorMessage: null,
        isSupported: true,
        permissionState: "unknown",
        status: "idle"
      })
    ).toBe("No camera found");
  });

  it("uses the camera error message when the stream fails", () => {
    expect(
      getCameraStatusLabel({
        deviceCount: 1,
        errorMessage: "Camera is already in use by another app.",
        isSupported: true,
        permissionState: "granted",
        status: "error"
      })
    ).toBe("Camera is already in use by another app.");
  });
});
