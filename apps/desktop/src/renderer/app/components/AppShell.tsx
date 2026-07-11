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
import { useEffect, useState } from "react";
import { navItems } from "../data";
import type { AppView } from "../data";

type AppShellProps = Readonly<{
  activeView: AppView;
  children: React.ReactNode;
  isCameraActive: boolean;
  isCameraRequesting: boolean;
  onCalibrate: () => void;
  onExport: () => void;
  onToggleCamera: () => void;
  onViewChange: (view: AppView) => void;
}>;

export function AppShell({
  activeView,
  children,
  isCameraActive,
  isCameraRequesting,
  onCalibrate,
  onExport,
  onToggleCamera,
  onViewChange
}: AppShellProps) {
  const sessionLabel = isCameraActive ? "Stop Session" : "Start Session";

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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
                aria-label={item.label}
                className={`nav-item${activeView === item.label ? " is-active" : ""}`}
                key={item.label}
                onClick={() => onViewChange(item.label)}
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
            <strong>{now.toLocaleTimeString()}</strong>
            <span>{now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>

          <button className="icon-button" type="button" aria-label="More">
            <MoreVertical size={22} />
          </button>
        </header>

        <main className="dashboard">
          <div className="dashboard-header">
            <h1>{activeView === "Monitor" ? "Live Monitor" : activeView}</h1>
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
              <button className="secondary-action" onClick={onCalibrate} type="button">
                <SlidersHorizontal size={19} />
                <span>Calibrate</span>
              </button>
              <button className="secondary-action" onClick={onExport} type="button">
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
