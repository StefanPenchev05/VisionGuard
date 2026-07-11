import { AppShell } from "./components/AppShell";
import { EventTimeline } from "./components/EventTimeline";
import { IdentityPanel } from "./components/IdentityPanel";
import { LiveVisionPanel } from "./components/LiveVisionPanel";
import { ModelHealth } from "./components/ModelHealth";

export function App() {
  return (
    <AppShell>
      <div className="dashboard-grid">
        <div className="main-column">
          <LiveVisionPanel />
          <ModelHealth />
          <EventTimeline />
        </div>
        <IdentityPanel />
      </div>
    </AppShell>
  );
}
