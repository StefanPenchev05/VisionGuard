export function LiveVisionPanel() {
  return (
    <section className="video-panel" aria-label="Desk Camera live monitor">
      <div className="video-toolbar">
        <strong>Desk Camera</strong>
        <div className="video-meta">
          <span>1920x1080</span>
          <span>30 FPS</span>
          <span className="live-dot">Live</span>
        </div>
      </div>

      <div className="camera-frame">
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

        <div className="camera-stats">
          <p>
            <span>Lighting</span>
            <strong>OK</strong>
          </p>
          <p>
            <span>FPS</span>
            <strong>30</strong>
          </p>
          <p>
            <span>Exposure</span>
            <strong>Auto</strong>
          </p>
          <p>
            <span>Resolution</span>
            <strong>1920 x 1080</strong>
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
      </div>
    </section>
  );
}
