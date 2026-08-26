import { Pause, Play } from "lucide-react";
import { useState } from "react";

export type TimelineEvent = {
  category: "gesture" | "identity" | "environment";
  confidence?: number;
  details: string;
  id: string;
  name: string;
  source: string;
  time: string;
  variant?: "success" | "warning";
};

type EventTimelineProps = {
  events: TimelineEvent[];
};

export function EventTimeline({ events }: EventTimelineProps) {
  const [filter, setFilter] = useState<"all" | "gesture" | "identity" | "environment">("all");
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const visibleEvents = events.filter((event) => filter === "all" || event.category === filter);

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
        {visibleEvents.length > 0 && !isPaused ? (
          visibleEvents.map((event) => (
            <div className={`event-row ${event.variant ?? ""}`} key={event.id} role="row">
              <span>{event.time}</span>
              <span className="event-name">{event.name}</span>
              <span>{event.category}</span>
              <span>{event.details}</span>
              <span>
                {typeof event.confidence === "number"
                  ? `${Math.round(event.confidence * 100)}%`
                  : "--"}
              </span>
              <span>{event.source}</span>
            </div>
          ))
        ) : (
          <div className="event-empty">
            No {filter === "all" ? "" : `${filter} `}events yet{isPaused ? " while paused" : ""}.
            {autoScroll ? "" : " Auto-scroll is off."}
          </div>
        )}
      </div>
    </section>
  );
}
