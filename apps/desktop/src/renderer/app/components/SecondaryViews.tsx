import { Activity, Camera, Database, Settings, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { ModelStatus } from "@visionguard/shared-kernel/contracts/ai";
import type { AppView } from "../data";
import type { GestureDefinition } from "../types/gestures";

type SecondaryViewsProps = Readonly<{
  activeView: Exclude<AppView, "Monitor" | "Gestures">;
  aiServiceUrl: string;
  aiServiceStatus: {
    checkedAt: string;
    errorMessage?: string;
    modelStatus?: ModelStatus;
    ok: boolean;
    serviceUrl: string;
  };
  cameraDevices: MediaDeviceInfo[];
  gestures: GestureDefinition[];
  isCameraActive: boolean;
  onSaveSettings: (settings: { aiServiceUrl: string }) => Promise<void>;
  persistenceStatus: "loading" | "ready" | "saving" | "error";
  selectedCameraId: string | null;
  settingsError: string | null;
  settingsStatus: "loading" | "ready" | "saving" | "error";
}>;

export function SecondaryViews({
  activeView,
  aiServiceUrl,
  aiServiceStatus,
  cameraDevices,
  gestures,
  isCameraActive,
  onSaveSettings,
  persistenceStatus,
  selectedCameraId,
  settingsError,
  settingsStatus
}: SecondaryViewsProps) {
  const [draftAiServiceUrl, setDraftAiServiceUrl] = useState(aiServiceUrl);

  useEffect(() => {
    setDraftAiServiceUrl(aiServiceUrl);
  }, [aiServiceUrl]);

  const handleSaveSettings = async () => {
    await onSaveSettings({ aiServiceUrl: draftAiServiceUrl });
  };

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
              <dd>{aiServiceStatus.serviceUrl}</dd>
            </div>
            <div>
              <dt>Gesture datasets</dt>
              <dd>{gestures.filter((gesture) => gesture.training?.datasetId).length} datasets</dd>
            </div>
            <div>
              <dt>Training status</dt>
              <dd>
                {!aiServiceStatus.ok
                  ? "AI service offline"
                  : gestures.some((gesture) => gesture.status === "training")
                  ? "Training"
                  : aiServiceStatus.modelStatus?.status === "ready"
                    ? "Model ready"
                    : "Waiting for trained gesture"}
              </dd>
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
          <div>
            <dt>Settings storage</dt>
            <dd>{settingsStatus}</dd>
          </div>
          <div>
            <dt>AI service</dt>
            <dd>{aiServiceStatus.ok ? "Online" : "Offline"}</dd>
          </div>
        </dl>
      </section>

      <section className="panel settings-panel">
        <div className="settings-title">
          <Activity size={22} />
          <div>
            <h2>AI Service</h2>
            <span>Local service used for gesture training and live inference.</span>
          </div>
        </div>
        <div className="settings-form">
          <label>
            <span>API URL</span>
            <input
              value={draftAiServiceUrl}
              onChange={(event) => setDraftAiServiceUrl(event.target.value)}
              placeholder="http://127.0.0.1:8765"
            />
          </label>
          {settingsError ? <p className="settings-error">{settingsError}</p> : null}
          {!aiServiceStatus.ok ? (
            <p className="settings-error">{aiServiceStatus.errorMessage ?? "AI service is offline."}</p>
          ) : null}
          <button
            className="primary-action"
            disabled={settingsStatus === "saving" || draftAiServiceUrl.trim().length === 0}
            onClick={handleSaveSettings}
            type="button"
          >
            {settingsStatus === "saving" ? "Saving..." : "Save AI Service URL"}
          </button>
        </div>
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
