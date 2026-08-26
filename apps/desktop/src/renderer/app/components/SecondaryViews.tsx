import { Activity, Camera, Database, Settings, ShieldCheck } from "lucide-react";
import type { AppView } from "../data";
import type { GestureDefinition } from "../types/gestures";

type SecondaryViewsProps = Readonly<{
  activeView: Exclude<AppView, "Monitor" | "Gestures">;
  cameraDevices: MediaDeviceInfo[];
  gestures: GestureDefinition[];
  isCameraActive: boolean;
  persistenceStatus: "loading" | "ready" | "saving" | "error";
  selectedCameraId: string | null;
}>;

export function SecondaryViews({
  activeView,
  cameraDevices,
  gestures,
  isCameraActive,
  persistenceStatus,
  selectedCameraId
}: SecondaryViewsProps) {
  if (activeView === "Identity") {
    return (
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="settings-title">
            <ShieldCheck size={22} />
            <div>
              <h2>Identity Session</h2>
              <span>Continuous authentication state from the current camera session.</span>
            </div>
          </div>
          <dl className="settings-list">
            <div>
              <dt>Camera session</dt>
              <dd>{isCameraActive ? "Active" : "Stopped"}</dd>
            </div>
            <div>
              <dt>Verification model</dt>
              <dd>Not connected</dd>
            </div>
            <div>
              <dt>Session trust</dt>
              <dd>Unavailable until model inference is connected</dd>
            </div>
          </dl>
        </section>
      </div>
    );
  }

  if (activeView === "Models") {
    return (
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="settings-title">
            <Activity size={22} />
            <div>
              <h2>Model Service</h2>
              <span>Configured training and inference boundary.</span>
            </div>
          </div>
          <dl className="settings-list">
            <div>
              <dt>Local API</dt>
              <dd>http://127.0.0.1:8765</dd>
            </div>
            <div>
              <dt>Gesture datasets</dt>
              <dd>{gestures.length} configured gestures</dd>
            </div>
            <div>
              <dt>Training status</dt>
              <dd>Ready to connect Send To Training to API</dd>
            </div>
          </dl>
        </section>
      </div>
    );
  }

  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="settings-title">
          <Settings size={22} />
          <div>
            <h2>Application Settings</h2>
            <span>Current local configuration and persistence state.</span>
          </div>
        </div>
        <dl className="settings-list">
          <div>
            <dt>Selected camera</dt>
            <dd>
              {cameraDevices.find((device) => device.deviceId === selectedCameraId)?.label ||
                "Default camera"}
            </dd>
          </div>
          <div>
            <dt>Available cameras</dt>
            <dd>{cameraDevices.length}</dd>
          </div>
          <div>
            <dt>Gesture storage</dt>
            <dd>{persistenceStatus}</dd>
          </div>
        </dl>
      </section>

      <section className="panel settings-panel">
        <div className="settings-title">
          <Database size={22} />
          <div>
            <h2>Local Data</h2>
            <span>Saved gesture definitions and captured sample references.</span>
          </div>
        </div>
        <dl className="settings-list">
          <div>
            <dt>Gestures</dt>
            <dd>{gestures.length}</dd>
          </div>
          <div>
            <dt>Sample files</dt>
            <dd>{gestures.reduce((count, gesture) => count + gesture.sampleFiles.length, 0)}</dd>
          </div>
          <div>
            <dt>Capture source</dt>
            <dd>
              <Camera size={14} /> Desktop camera
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
