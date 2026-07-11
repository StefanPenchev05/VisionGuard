import { useState } from "react";
import { AppShell } from "./components/AppShell";
import { CalibrationModal } from "./components/CalibrationModal";
import { EventTimeline } from "./components/EventTimeline";
import { GesturesPanel } from "./components/GesturesPanel";
import type { GestureDefinition } from "./components/GesturesPanel";
import { IdentityPanel } from "./components/IdentityPanel";
import { LiveVisionPanel } from "./components/LiveVisionPanel";
import { ModelHealth } from "./components/ModelHealth";
import { useCameraStream } from "../shared/hooks/useCameraStream";
import type { AppView } from "./data";

const initialGestures: GestureDefinition[] = [
  {
    id: "gesture-open-palm",
    actionTarget: "Safari",
    actionType: "open-app",
    confidenceTarget: 92,
    createdAt: new Date().toISOString(),
    description: "Baseline hand-open gesture for app launch",
    name: "Open Palm",
    samples: 18,
    status: "ready"
  },
  {
    id: "gesture-swipe-down",
    actionTarget: "System volume -10%",
    actionType: "volume-down",
    confidenceTarget: 90,
    createdAt: new Date().toISOString(),
    description: "Downward hand movement mapped to volume control",
    name: "Swipe Down",
    samples: 14,
    status: "ready"
  },
  {
    id: "gesture-closed-fist",
    actionTarget: "Toggle mute",
    actionType: "mute",
    confidenceTarget: 94,
    createdAt: new Date().toISOString(),
    description: "Closed-fist hold for audio mute",
    name: "Closed Fist",
    samples: 7,
    status: "draft"
  }
];

export function App() {
  const camera = useCameraStream();
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("Monitor");
  const [gestureDefinitions, setGestureDefinitions] = useState(initialGestures);

  const handleExport = () => {
    const track = camera.stream?.getVideoTracks()[0];
    const settings = track?.getSettings();

    const payload = {
      exportedAt: new Date().toISOString(),
      camera: {
        active: camera.isCameraActive,
        resolution: settings?.width && settings?.height
          ? `${settings.width}x${settings.height}`
          : null,
        frameRate: settings?.frameRate ?? null,
        deviceId: settings?.deviceId ?? null,
      },
      gestures: gestureDefinitions,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `visionguard-session-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AppShell
        activeView={activeView}
        isCameraActive={camera.isCameraActive}
        isCameraRequesting={camera.status === "requesting"}
        onCalibrate={() => setIsCalibrating(true)}
        onExport={handleExport}
        onToggleCamera={camera.toggleCamera}
        onViewChange={setActiveView}
      >
        {activeView === "Gestures" ? (
          <GesturesPanel
            gestures={gestureDefinitions}
            isCameraActive={camera.isCameraActive}
            onAddGesture={(gesture) =>
              setGestureDefinitions((current) => [gesture, ...current])
            }
            onStartCamera={camera.startCamera}
            onUpdateGesture={(updatedGesture) =>
              setGestureDefinitions((current) =>
                current.map((gesture) =>
                  gesture.id === updatedGesture.id ? updatedGesture : gesture
                )
              )
            }
            stream={camera.stream}
          />
        ) : (
          <div className="dashboard-grid">
            <div className="main-column">
              <LiveVisionPanel
                errorMessage={camera.errorMessage}
                isCameraActive={camera.isCameraActive}
                status={camera.status}
                stream={camera.stream}
              />
              <ModelHealth />
              <EventTimeline />
            </div>
            <IdentityPanel />
          </div>
        )}
      </AppShell>

      {isCalibrating && (
        <CalibrationModal
          isCameraActive={camera.isCameraActive}
          onClose={() => setIsCalibrating(false)}
          stream={camera.stream}
        />
      )}
    </>
  );
}
