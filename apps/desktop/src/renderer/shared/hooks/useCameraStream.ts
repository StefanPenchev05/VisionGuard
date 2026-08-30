import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "active" | "error";

export function buildCameraConstraints(deviceId: string | null): MediaStreamConstraints {
  return {
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 }
    },
    audio: false
  };
}

export function getCameraErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "Camera could not be started.";
  }

  if (error.name === "NotAllowedError") {
    return "Camera permission was denied.";
  }

  if (error.name === "NotFoundError") {
    return "No camera was found.";
  }

  if (error.name === "NotReadableError") {
    return "Camera is already in use by another app.";
  }

  return error.message || "Camera could not be started.";
}

function shouldRetryWithDefaultCamera(error: unknown, deviceId: string | null): boolean {
  return Boolean(
    deviceId &&
    error instanceof DOMException &&
    (error.name === "OverconstrainedError" || error.name === "NotFoundError")
  );
}

export function useCameraStream() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(() =>
    window.localStorage.getItem("visionguard.camera.deviceId")
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const selectedDeviceIdRef = useRef(selectedDeviceId);

  const setActiveStream = useCallback((mediaStream: MediaStream | null) => {
    activeStreamRef.current = mediaStream;
    setStream(mediaStream);

    mediaStream?.getVideoTracks().forEach((track) => {
      track.onended = () => {
        if (activeStreamRef.current === mediaStream) {
          activeStreamRef.current = null;
          setStream(null);
          setStatus("idle");
        }
      };
    });
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDevices([]);
      return;
    }

    const mediaDevices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = mediaDevices.filter((device) => device.kind === "videoinput");
    setDevices(videoDevices);

    if (
      selectedDeviceIdRef.current &&
      !videoDevices.some((device) => device.deviceId === selectedDeviceIdRef.current)
    ) {
      selectedDeviceIdRef.current = null;
      setSelectedDeviceId(null);
      window.localStorage.removeItem("visionguard.camera.deviceId");
    }
  }, []);

  const stopCamera = useCallback(() => {
    activeStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    setActiveStream(null);
    setStatus("idle");
  }, [setActiveStream]);

  const startCamera = useCallback(async (deviceId = selectedDeviceIdRef.current) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("Camera access is not supported in this runtime.");
      return;
    }

    setStatus("requesting");
    setErrorMessage(null);

    try {
      activeStreamRef.current?.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      let mediaStream: MediaStream;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(buildCameraConstraints(deviceId));
      } catch (error) {
        if (!shouldRetryWithDefaultCamera(error, deviceId)) {
          throw error;
        }

        selectedDeviceIdRef.current = null;
        setSelectedDeviceId(null);
        window.localStorage.removeItem("visionguard.camera.deviceId");
        mediaStream = await navigator.mediaDevices.getUserMedia(buildCameraConstraints(null));
      }

      setActiveStream(mediaStream);
      setStatus("active");
      await refreshDevices();
    } catch (error) {
      setActiveStream(null);
      setStatus("error");
      setErrorMessage(getCameraErrorMessage(error));
    }
  }, [refreshDevices, setActiveStream]);

  const toggleCamera = useCallback(() => {
    if (activeStreamRef.current) {
      stopCamera();
      return;
    }

    void startCamera();
  }, [startCamera, stopCamera]);

  const selectCamera = useCallback(
    (deviceId: string) => {
      selectedDeviceIdRef.current = deviceId || null;
      setSelectedDeviceId(deviceId || null);

      if (deviceId) {
        window.localStorage.setItem("visionguard.camera.deviceId", deviceId);
      } else {
        window.localStorage.removeItem("visionguard.camera.deviceId");
      }

      if (activeStreamRef.current) {
        void startCamera(deviceId || null);
      }
    },
    [startCamera]
  );

  useEffect(() => {
    void refreshDevices();

    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
  }, [refreshDevices]);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    devices,
    errorMessage,
    isCameraActive: status === "active",
    refreshDevices,
    selectCamera,
    selectedDeviceId,
    startCamera,
    status,
    stopCamera,
    stream,
    toggleCamera
  };
}
