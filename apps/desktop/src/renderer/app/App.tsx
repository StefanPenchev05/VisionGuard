import { useState } from "react";
import { AppShell } from "./components/AppShell";
import { CalibrationModal } from "./components/CalibrationModal";
import { EventTimeline } from "./components/EventTimeline";
import { IdentityPanel } from "./components/IdentityPanel";
import { LiveVisionPanel } from "./components/LiveVisionPanel";
import { ModelHealth } from "./components/ModelHealth";
import { useCameraStream } from "../shared/hooks/useCameraStream";

export function App() {
  const camera = useCameraStream();
  const [isCalibrating, setIsCalibrating] = useState(false);

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
        isCameraActive={camera.isCameraActive}
        isCameraRequesting={camera.status === "requesting"}
        onCalibrate={() => setIsCalibrating(true)}
        onExport={handleExport}
        onToggleCamera={camera.toggleCamera}
      >
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
