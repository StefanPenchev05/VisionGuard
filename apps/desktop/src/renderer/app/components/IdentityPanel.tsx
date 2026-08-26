import { ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";

export function IdentityPanel() {
  const [showAllRiskEvents, setShowAllRiskEvents] = useState(false);

  return (
    <aside className="identity-column">
      <section className="panel active-user">
        <div className="section-heading">
          <h2>Active User</h2>
          <span className="verified-chip">
            <ShieldCheck size={15} />
            Unverified
          </span>
        </div>

        <div className="profile-row">
          <div className="avatar">
            <UserRound size={54} />
          </div>
          <div>
            <strong>—</strong>
            <span>No active session</span>
          </div>
        </div>

        <div className="trust-card">
          <div>
            <span>Confidence</span>
            <strong>—</strong>
          </div>
          <div className="trust-ring">
            <strong>—</strong>
            <span>/100</span>
          </div>
          <div>
            <span>Gesture Match</span>
            <strong>—</strong>
          </div>
        </div>
      </section>

      <section className="panel risk-panel">
        <div className="section-heading">
          <h2>Recent Risk Events</h2>
          <button onClick={() => setShowAllRiskEvents((current) => !current)} type="button">
            {showAllRiskEvents ? "Show Recent" : "View All"}
          </button>
        </div>
        <div className="risk-list">
          <p className="risk-empty">
            {showAllRiskEvents ? "No historical risk events." : "No recent risk events."}
          </p>
        </div>
      </section>

      <section className="panel gesture-panel">
        <h2>Gesture Activity <span>(Live)</span></h2>
        <div className="gesture-grid">
          <p className="gesture-empty">No gesture data.</p>
        </div>
      </section>
    </aside>
  );
}
