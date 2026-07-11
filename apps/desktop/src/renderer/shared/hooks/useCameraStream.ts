import { useCallback, useEffect, useRef, useState } from "react";

type CameraStatus = "idle" | "requesting" | "active" | "error";

const cameraConstraints: MediaStreamConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: false
};

function getCameraErrorMessage(error: unknown): string {
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

export function useCameraStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    activeStreamRef.current?.getTracks().forEach((track) => track.stop());
    activeStreamRef.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("Camera access is not supported in this runtime.");
      return;
    }

    setStatus("requesting");
    setErrorMessage(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
      activeStreamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus("active");
    } catch (error) {
      activeStreamRef.current = null;
      setStream(null);
      setStatus("error");
      setErrorMessage(getCameraErrorMessage(error));
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (activeStreamRef.current) {
      stopCamera();
      return;
    }

    void startCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    errorMessage,
    isCameraActive: status === "active",
    startCamera,
    status,
    stopCamera,
    stream,
    toggleCamera
  };
}
