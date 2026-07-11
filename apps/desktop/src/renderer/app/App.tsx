import { AppShell } from "./components/AppShell";
import { EventTimeline } from "./components/EventTimeline";
import { IdentityPanel } from "./components/IdentityPanel";
import { LiveVisionPanel } from "./components/LiveVisionPanel";
import { ModelHealth } from "./components/ModelHealth";
import { useCameraStream } from "../shared/hooks/useCameraStream";

export function App() {
  const camera = useCameraStream();

  return (
    <AppShell
      isCameraActive={camera.isCameraActive}
      isCameraRequesting={camera.status === "requesting"}
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
  );
}
