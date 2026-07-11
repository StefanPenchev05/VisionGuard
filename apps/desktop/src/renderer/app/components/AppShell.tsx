import {
  Camera,
  Download,
  Menu,
  MoreVertical,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  SunMedium
} from "lucide-react";
import { navItems } from "../data";

type AppShellProps = {
  children: React.ReactNode;
  isCameraActive: boolean;
  isCameraRequesting: boolean;
  onToggleCamera: () => void;
};

export function AppShell({
  children,
  isCameraActive,
  isCameraRequesting,
  onToggleCamera
}: AppShellProps) {
  const sessionLabel = isCameraActive ? "Stop Session" : "Start Session";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ShieldCheck size={28} />
          <span>VisionGuard</span>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                className={`nav-item${item.active ? " is-active" : ""}`}
                key={item.label}
                type="button"
              >
                <Icon size={23} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="operator-card">
          <div className="operator-icon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>Operator</strong>
            <span>Security Team</span>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button" type="button" aria-label="Open menu">
            <Menu size={22} />
          </button>

          <div className="system-status">
            <ShieldCheck size={20} />
            <div>
              <span>System Status</span>
              <strong>Healthy</strong>
            </div>
          </div>

          <button className="camera-select" type="button">
            <Camera size={18} />
            <span>Desk Camera</span>
            <SlidersHorizontal size={16} />
          </button>

          <button className="icon-button" type="button" aria-label="Display">
            <SunMedium size={21} />
          </button>

          <div className="clock">
            <strong>10:42:18 AM</strong>
            <span>May 20, 2025</span>
          </div>

          <button className="icon-button" type="button" aria-label="More">
            <MoreVertical size={22} />
          </button>
        </header>

        <main className="dashboard">
          <div className="dashboard-header">
            <h1>Live Monitor</h1>
            <div className="actions">
              <button
                className={`primary-action${isCameraActive ? " is-live" : ""}`}
                disabled={isCameraRequesting}
                onClick={onToggleCamera}
                type="button"
              >
                <Play size={20} fill="currentColor" />
                <span>{isCameraRequesting ? "Connecting..." : sessionLabel}</span>
              </button>
              <button className="secondary-action" type="button">
                <SlidersHorizontal size={19} />
                <span>Calibrate</span>
              </button>
              <button className="secondary-action" type="button">
                <Download size={19} />
                <span>Export</span>
              </button>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
