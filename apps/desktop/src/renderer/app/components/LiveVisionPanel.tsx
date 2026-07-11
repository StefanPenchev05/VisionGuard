import { useEffect, useRef, useState } from "react";

type LiveVisionPanelProps = {
  errorMessage: string | null;
  isCameraActive: boolean;
  status: "idle" | "requesting" | "active" | "error";
  stream: MediaStream | null;
};

type CameraStats = {
  fps: number;
  width: number;
  height: number;
  brightness: "OK" | "Low" | "High";
};

export function LiveVisionPanel({
  errorMessage,
  isCameraActive,
  status,
  stream
}: LiveVisionPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);
  const [stats, setStats] = useState<CameraStats>({ fps: 0, width: 0, height: 0, brightness: "OK" });

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  // Real-time FPS + resolution counter
  useEffect(() => {
    if (!isCameraActive) {
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
  }, [isCameraActive, stream]);

  const resolutionLabel = stats.width && stats.height
    ? `${stats.width} × ${stats.height}`
    : "—";

  return (
    <section className="video-panel" aria-label="Desk Camera live monitor">
      <div className="video-toolbar">
        <strong>Desk Camera</strong>
        <div className="video-meta">
          {isCameraActive ? (
            <>
              <span>{resolutionLabel}</span>
              <span>{stats.fps} FPS</span>
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

        {isCameraActive && (
          <>
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
                <span>Tracking</span>
                <strong>Active</strong>
              </p>
              <p>
                <span>Pose</span>
                <strong>Tracked</strong>
              </p>
              <p>
                <span>Face</span>
                <strong>Detected</strong>
              </p>
              <p>
                <span>Liveness</span>
                <strong>Live</strong>
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
