import { ShieldCheck, ShieldOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { InferenceResult, ModelStatus } from "@visionguard/shared-kernel/contracts/ai";

type LiveVisionPanelProps = {
  actionExecution: {
    message: string;
    status: "idle" | "executing" | "success" | "warning";
  };
  actionsArmed: boolean;
  aiServiceStatus: {
    errorMessage?: string;
    modelStatus?: ModelStatus;
    ok: boolean;
  };
  errorMessage: string | null;
  inferenceEnabled: boolean;
  inferenceError: string | null;
  inferenceResult: InferenceResult | null;
  inferenceStatus: "idle" | "running" | "error";
  isCameraActive: boolean;
  onInferenceFrame: (frame: {
    capturedAt: string;
    dataUrl: string;
    frameId: string;
  }) => void;
  onToggleActionsArmed: () => void;
  status: "idle" | "requesting" | "active" | "error";
  stream: MediaStream | null;
};

type CameraStats = {
  fps: number;
  width: number;
  height: number;
  brightness: "OK" | "Low" | "High";
};

export function getLiveActionStatusLabel(params: {
  actionMessage: string;
  actionsArmed: boolean;
  hasPrediction: boolean;
}): string {
  if (params.actionsArmed) {
    return params.actionMessage;
  }

  return params.hasPrediction ? params.actionMessage : "Disarmed";
}

export function LiveVisionPanel({
  actionExecution,
  actionsArmed,
  aiServiceStatus,
  errorMessage,
  inferenceEnabled,
  inferenceError,
  inferenceResult,
  inferenceStatus,
  isCameraActive,
  onInferenceFrame,
  onToggleActionsArmed,
  status,
  stream
}: LiveVisionPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);
  const [stats, setStats] = useState<CameraStats>({ fps: 0, width: 0, height: 0, brightness: "OK" });
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    setIsPreviewReady(false);
  }, [stream]);

  useEffect(() => {
    if (!isCameraActive) {
      setIsPreviewReady(false);
    }
  }, [isCameraActive]);

  useEffect(() => {
    if (!isCameraActive || !isPreviewReady || !inferenceEnabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const video = videoRef.current;

      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      onInferenceFrame({
        capturedAt: new Date().toISOString(),
        dataUrl: canvas.toDataURL("image/jpeg", 0.8),
        frameId: crypto.randomUUID()
      });
    }, 1_200);

    return () => window.clearInterval(intervalId);
  }, [inferenceEnabled, isCameraActive, isPreviewReady, onInferenceFrame]);

  // Real-time FPS + resolution counter
  useEffect(() => {
    if (!isCameraActive || !isPreviewReady) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setStats({ fps: 0, width: 0, height: 0, brightness: "OK" });
      return;
    }

    const tick = () => {
      frameCountRef.current += 1;
      const now = performance.now();
      const elapsed = now - lastFpsTimeRef.current;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;

        const video = videoRef.current;
        const track = stream?.getVideoTracks()[0];
        const settings = track?.getSettings();

        setStats({
          fps,
          width: settings?.width ?? video?.videoWidth ?? 0,
          height: settings?.height ?? video?.videoHeight ?? 0,
          brightness: "OK"
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isCameraActive, isPreviewReady, stream]);

  const resolutionLabel = stats.width && stats.height
    ? `${stats.width} × ${stats.height}`
    : "—";
  const readinessLabel = !aiServiceStatus.ok
    ? "AI service offline"
    : aiServiceStatus.modelStatus?.status !== "ready"
      ? "No trained model"
      : inferenceError
        ? "Inference error"
        : inferenceEnabled
          ? "Ready for inference"
          : "Waiting";
  const actionStatusLabel = getLiveActionStatusLabel({
    actionMessage: actionExecution.message,
    actionsArmed,
    hasPrediction: Boolean(inferenceResult?.bestPrediction)
  });

  return (
    <section className="video-panel" aria-label="Desk Camera live monitor">
      <div className="video-toolbar">
        <strong>Desk Camera</strong>
        <div className="video-meta">
          <button
            aria-label={actionsArmed ? "Disarm desktop actions" : "Arm desktop actions"}
            aria-pressed={actionsArmed}
            className={`action-arm-button${actionsArmed ? " is-armed" : ""}`}
            onClick={onToggleActionsArmed}
            title={actionsArmed ? "Desktop actions can execute" : "Click to allow recognized gestures to run desktop actions"}
            type="button"
          >
            {actionsArmed ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
            <span>{actionsArmed ? "Actions Armed" : "Arm Actions"}</span>
          </button>
          {isCameraActive ? (
            <>
              <span>{resolutionLabel}</span>
              <span>{isPreviewReady ? stats.fps : 0} FPS</span>
            </>
          ) : (
            <>
              <span>—</span>
              <span>— FPS</span>
            </>
          )}
          <span className={isCameraActive ? "live-dot" : "standby-dot"}>
            {isCameraActive ? "Live" : "Standby"}
          </span>
        </div>
      </div>

      <div className={`camera-frame${isCameraActive ? " has-video" : ""}`}>
        {isCameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            className="camera-video"
            muted
            onLoadedMetadata={(event) => {
              setIsPreviewReady(true);
              void event.currentTarget.play();
            }}
            onPlaying={() => setIsPreviewReady(true)}
            onWaiting={() => setIsPreviewReady(false)}
            playsInline
          />
        ) : (
          <>
            <div className="room room-left" />
            <div className="room room-right" />
            <div className="desk" />
            <div className="monitor-shape" />
            <div className="lamp" />
            <div className="person">
              <div className="head" />
              <div className="torso" />
              <div className="arm arm-left" />
              <div className="arm arm-right" />
            </div>
          </>
        )}

        {!isCameraActive && (
          <div className="camera-status">
            <strong>
              {status === "requesting"
                ? "Requesting camera access"
                : status === "error"
                  ? "Camera unavailable"
                  : "Camera standby"}
            </strong>
            <span>
              {errorMessage ?? "Press Start Session to connect Desk Camera."}
            </span>
          </div>
        )}

        {isCameraActive && !isPreviewReady && (
          <div className="camera-status">
            <strong>Starting camera preview</strong>
            <span>Waiting for the video stream to become readable.</span>
          </div>
        )}

        {!isCameraActive && (
          <>
            <div className="face-box">
              <span />
            </div>
            <div className="hand-box">
              <div className="hand-skeleton">
                {Array.from({ length: 17 }).map((_, index) => (
                  <i key={index} />
                ))}
              </div>
            </div>
            <svg className="pose-lines" viewBox="0 0 720 390" aria-hidden="true">
              <path d="M262 210 L337 230 L454 232 L542 306" />
              <path d="M338 230 L300 308" />
              <path d="M454 232 L468 360" />
              <circle cx="262" cy="210" r="4" />
              <circle cx="337" cy="230" r="4" />
              <circle cx="454" cy="232" r="4" />
              <circle cx="542" cy="306" r="4" />
              <circle cx="300" cy="308" r="4" />
            </svg>
          </>
        )}

        {isCameraActive && isPreviewReady && (
          <>
            <div className="prediction-card">
              <span>Gesture</span>
              <strong>
                {inferenceResult?.bestPrediction?.label ??
                  (inferenceResult ? "No hand detected" : "Waiting")}
              </strong>
              <em>
                {inferenceStatus === "running"
                  ? "Scanning"
                  : !aiServiceStatus.ok
                    ? "Service offline"
                    : aiServiceStatus.modelStatus?.status !== "ready"
                      ? "Train a model"
                      : inferenceError
                        ? "Error"
                    : inferenceResult?.bestPrediction
                      ? `${Math.round(inferenceResult.bestPrediction.confidence * 100)}%`
                      : inferenceResult
                        ? "Hand required"
                      : inferenceEnabled
                        ? "Ready"
                        : "No trained model"}
              </em>
            </div>
            <div className="camera-stats">
              <p>
                <span>Brightness</span>
                <strong>{stats.brightness}</strong>
              </p>
              <p>
                <span>FPS</span>
                <strong>{stats.fps}</strong>
              </p>
              <p>
                <span>Exposure</span>
                <strong>Auto</strong>
              </p>
              <p>
                <span>Resolution</span>
                <strong>{resolutionLabel}</strong>
              </p>
            </div>

            <div className="tracking-stats">
              <p>
                <span>Inference</span>
                <strong>{inferenceEnabled ? "Active" : "Standby"}</strong>
              </p>
              <p>
                <span>Model</span>
                <strong>{aiServiceStatus.modelStatus?.status ?? "Unknown"}</strong>
              </p>
              <p>
                <span>Service</span>
                <strong>{aiServiceStatus.ok ? "Online" : "Offline"}</strong>
              </p>
              <p>
                <span>State</span>
                <strong>{readinessLabel}</strong>
              </p>
              <p>
                <span>Action</span>
                <strong className={`action-state ${actionExecution.status}`}>
                  {actionStatusLabel}
                </strong>
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
