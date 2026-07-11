import { ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import { gestures, riskEvents } from "../data";

export function IdentityPanel() {
  return (
    <aside className="identity-column">
      <section className="panel active-user">
        <div className="section-heading">
          <h2>Active User</h2>
          <span className="verified-chip">
            <ShieldCheck size={15} />
            Verified
          </span>
        </div>

        <div className="profile-row">
          <div className="avatar">
            <UserRound size={54} />
          </div>
          <div>
            <strong>Operator</strong>
            <span>Security Team</span>
            <small>Session ID: 9f3a7c2e-1b6d-4f21</small>
            <small>Since 10:39:12 AM (00:03:06)</small>
          </div>
        </div>

        <div className="trust-card">
          <div>
            <span>Confidence</span>
            <strong>97.8%</strong>
          </div>
          <div className="trust-ring">
            <strong>97</strong>
            <span>/100</span>
          </div>
          <div>
            <span>Gesture Match</span>
            <strong>96.4%</strong>
          </div>
        </div>
      </section>

      <section className="panel risk-panel">
        <div className="section-heading">
          <h2>Recent Risk Events</h2>
          <button type="button">View All</button>
        </div>
        <div className="risk-list">
          {riskEvents.map((event, index) => (
            <article className="risk-item" key={event.label}>
              <TriangleAlert size={24} className={index === 0 ? "risk-low" : "risk-medium"} />
              <div>
                <strong>{event.label}</strong>
                <span>{event.time}</span>
              </div>
              <em className={index === 0 ? "low" : "medium"}>{event.severity}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="panel gesture-panel">
        <h2>Gesture Activity <span>(Live)</span></h2>
        <div className="gesture-grid">
          {gestures.map((gesture) => {
            const Icon = gesture.icon;

            return (
              <article className="gesture-card" key={gesture.label}>
                <Icon size={46} />
                <strong>{gesture.label}</strong>
                <span>{gesture.time}</span>
                <div className="progress-track">
                  <i style={{ width: `${gesture.progress}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
