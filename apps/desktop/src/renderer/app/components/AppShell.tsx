import {
  Camera,
  Download,
  Menu,
  MoreVertical,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  SunMedium,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { navItems } from "../data";
import type { AppView } from "../data";

type AppShellProps = Readonly<{
  activeView: AppView;
  children: React.ReactNode;
  cameraDevices: MediaDeviceInfo[];
  cameraStatusLabel: string;
  isCameraActive: boolean;
  isCameraRequesting: boolean;
  onCalibrate: () => void;
  onExport: () => void;
  onRefreshCameras: () => void;
  onSelectCamera: (deviceId: string) => void;
  onToggleCamera: () => void;
  onViewChange: (view: AppView) => void;
  selectedCameraId: string | null;
}>;

export function AppShell({
  activeView,
  cameraDevices,
  cameraStatusLabel,
  children,
  isCameraActive,
  isCameraRequesting,
  onCalibrate,
  onExport,
  onRefreshCameras,
  onSelectCamera,
  onToggleCamera,
  onViewChange,
  selectedCameraId
}: AppShellProps) {
  const sessionLabel = isCameraActive ? "Stop Session" : "Start Session";

  const [now, setNow] = useState(new Date());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<"default" | "bright">("default");
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const selectedCameraLabel =
    cameraDevices.find((device) => device.deviceId === selectedCameraId)?.label ||
    cameraDevices[0]?.label ||
    "Desk Camera";
  const cameraLabel = cameraDevices.length > 0 ? selectedCameraLabel : cameraStatusLabel;

  return (
    <div className={`app-shell${isSidebarCollapsed ? " sidebar-collapsed" : ""}${themeMode === "bright" ? " bright-mode" : ""}`}>
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
          <button
            className="icon-button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            type="button"
            aria-label={isSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {isSidebarCollapsed ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="system-status">
            <ShieldCheck size={20} />
            <div>
              <span>System Status</span>
              <strong>Healthy</strong>
            </div>
          </div>

          <label className="camera-select">
            <Camera size={18} />
            <select
              aria-label="Camera device"
              disabled={isCameraRequesting || cameraDevices.length === 0}
              onChange={(event) => onSelectCamera(event.target.value)}
              onFocus={onRefreshCameras}
              value={selectedCameraId ?? cameraDevices[0]?.deviceId ?? ""}
            >
              {cameraDevices.length === 0 ? (
                <option value="">No camera found</option>
              ) : (
                cameraDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))
              )}
            </select>
            <span title={cameraLabel}>{cameraLabel}</span>
            <strong className={`camera-health ${isCameraActive ? "is-active" : ""}`}>
              {cameraStatusLabel}
            </strong>
          </label>

          <button
            className={`icon-button${themeMode === "bright" ? " is-selected" : ""}`}
            onClick={() => setThemeMode((current) => (current === "default" ? "bright" : "default"))}
            type="button"
            aria-label="Toggle display brightness"
          >
            <SunMedium size={21} />
          </button>

          <div className="clock">
            <strong>{now.toLocaleTimeString()}</strong>
            <span>{now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>

          <button
            className="icon-button"
            onClick={() => setIsMoreOpen((current) => !current)}
            type="button"
            aria-expanded={isMoreOpen}
            aria-label="More actions"
          >
            <MoreVertical size={22} />
          </button>
          {isMoreOpen ? (
            <div className="topbar-menu" role="menu">
              <button onClick={onRefreshCameras} role="menuitem" type="button">
                Refresh cameras
              </button>
              <button disabled={!isCameraActive} onClick={onCalibrate} role="menuitem" type="button">
                Calibrate camera
              </button>
              <button onClick={onExport} role="menuitem" type="button">
                Export session
              </button>
            </div>
          ) : null}
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
              <button
                className="secondary-action"
                disabled={!isCameraActive}
                onClick={onCalibrate}
                title={isCameraActive ? "Run camera calibration" : "Start a session before calibration"}
                type="button"
              >
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
