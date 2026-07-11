import { Pause } from "lucide-react";

export function EventTimeline() {
  return (
    <section className="panel event-timeline">
      <div className="section-heading">
        <h2>Event Timeline</h2>
        <div className="timeline-controls">
          <button type="button">All Events</button>
          <button className="pause-button" type="button" aria-label="Pause">
            <Pause size={14} />
          </button>
          <label className="toggle">
            <span>Auto-scroll</span>
            <input type="checkbox" defaultChecked />
          </label>
        </div>
      </div>

      <div className="event-table" role="table">
        <div className="event-row event-head" role="row">
          <span>Time</span>
          <span>Event</span>
          <span>Category</span>
          <span>Details</span>
          <span>Confidence</span>
          <span>Source</span>
        </div>
        <div className="event-empty">No events yet.</div>
      </div>
    </section>
  );
}
