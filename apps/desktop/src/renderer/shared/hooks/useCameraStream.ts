import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "active" | "error";
export type CameraPermissionState = PermissionState | "unsupported" | "unknown";

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

export function getCameraStatusLabel(params: {
  deviceCount: number;
  errorMessage: string | null;
  isSupported: boolean;
  permissionState: CameraPermissionState;
  status: CameraStatus;
}): string {
  if (!params.isSupported) {
    return "Unsupported";
  }

  if (params.status === "requesting") {
    return "Connecting";
  }

  if (params.status === "active") {
    return "Connected";
  }

  if (params.status === "error") {
    return params.errorMessage ?? "Unavailable";
  }

  if (params.permissionState === "denied") {
    return "Permission denied";
  }

  if (params.deviceCount === 0) {
    return "No camera found";
  }

  if (params.permissionState === "prompt") {
    return "Permission needed";
  }

  return "Ready";
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
  const [permissionState, setPermissionState] = useState<CameraPermissionState>("unknown");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(() =>
    window.localStorage.getItem("visionguard.camera.deviceId")
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const selectedDeviceIdRef = useRef(selectedDeviceId);
  const isCameraSupported = Boolean(navigator.mediaDevices?.getUserMedia);

  const setActiveStream = useCallback((mediaStream: MediaStream | null) => {
    activeStreamRef.current = mediaStream;
    setStream(mediaStream);

    mediaStream?.getVideoTracks().forEach((track) => {
      const handleTrackEnded = () => {
        if (activeStreamRef.current === mediaStream) {
          activeStreamRef.current = null;
          setStream(null);
          setStatus("idle");
        }
      };
      track.onended = handleTrackEnded;
      track.onmute = () => {
        if (activeStreamRef.current === mediaStream) {
          setStatus("idle");
        }
      };
      track.onunmute = () => {
        if (activeStreamRef.current === mediaStream) {
          setStatus("active");
        }
      };
    });
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDevices([]);
      return;
    }

    try {
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
    } catch {
      setDevices([]);
    }
  }, []);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    activeStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.onmute = null;
      track.onunmute = null;
      track.stop();
    });
    setActiveStream(null);
    setStatus("idle");
    setErrorMessage(null);
  }, [setActiveStream]);

  const startCamera = useCallback(async (deviceId = selectedDeviceIdRef.current) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("Camera access is not supported in this runtime.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStatus("requesting");
    setErrorMessage(null);

    try {
      activeStreamRef.current?.getTracks().forEach((track) => {
        track.onended = null;
        track.onmute = null;
        track.onunmute = null;
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

      if (requestIdRef.current !== requestId) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      setActiveStream(mediaStream);
      setStatus("active");
      setPermissionState("granted");
      await refreshDevices();
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setActiveStream(null);
      setStatus("error");
      setErrorMessage(getCameraErrorMessage(error));
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setPermissionState("denied");
      }
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
      setErrorMessage(null);

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

  useEffect(() => {
    let isMounted = true;
    let permissionStatus: PermissionStatus | null = null;

    if (!navigator.permissions?.query) {
      setPermissionState(isCameraSupported ? "unknown" : "unsupported");
      return undefined;
    }

    void navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((statusResult) => {
        if (!isMounted) return;

        permissionStatus = statusResult;
        setPermissionState(statusResult.state);
        statusResult.onchange = () => setPermissionState(statusResult.state);
      })
      .catch(() => {
        if (isMounted) {
          setPermissionState(isCameraSupported ? "unknown" : "unsupported");
        }
      });

    return () => {
      isMounted = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [isCameraSupported]);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    activeCameraLabel: devices.find((device) => device.deviceId === selectedDeviceId)?.label ?? null,
    devices,
    errorMessage,
    isCameraActive: status === "active",
    isCameraSupported,
    permissionState,
    refreshDevices,
    selectCamera,
    selectedDeviceId,
    startCamera,
    status,
    statusLabel: getCameraStatusLabel({
      deviceCount: devices.length,
      errorMessage,
      isSupported: isCameraSupported,
      permissionState,
      status
    }),
    stopCamera,
    stream,
    toggleCamera
  };
}
