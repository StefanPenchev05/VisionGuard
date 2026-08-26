import { Pause, Play } from "lucide-react";
import { useState } from "react";

export function EventTimeline() {
  const [filter, setFilter] = useState<"all" | "gesture" | "identity" | "environment">("all");
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  return (
    <section className="panel event-timeline">
      <div className="section-heading">
        <h2>Event Timeline</h2>
        <div className="timeline-controls">
          <select
            aria-label="Timeline filter"
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            value={filter}
          >
            <option value="all">All Events</option>
            <option value="gesture">Gesture</option>
            <option value="identity">Identity</option>
            <option value="environment">Environment</option>
          </select>
          <button
            className="pause-button"
            onClick={() => setIsPaused((current) => !current)}
            type="button"
            aria-label={isPaused ? "Resume timeline" : "Pause timeline"}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <label className="toggle">
            <span>Auto-scroll</span>
            <input
              checked={autoScroll}
              onChange={(event) => setAutoScroll(event.target.checked)}
              type="checkbox"
            />
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
        <div className="event-empty">
          No {filter === "all" ? "" : `${filter} `}events yet{isPaused ? " while paused" : ""}.
          {autoScroll ? "" : " Auto-scroll is off."}
        </div>
      </div>
    </section>
  );
}
