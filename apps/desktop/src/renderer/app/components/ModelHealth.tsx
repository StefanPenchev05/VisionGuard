import { modelHealth } from "../data";

export function ModelHealth() {
  return (
    <section className="panel model-health">
      <h2>Model Health</h2>
      <div className="model-grid">
        {modelHealth.map((model) => {
          const Icon = model.icon;

          return (
            <article className="model-card" key={model.name}>
              <div className="model-icon">
                <Icon size={22} />
              </div>
              <div className="model-content">
                <div className="model-title">
                  <strong>{model.name}</strong>
                  <span>Healthy</span>
                </div>
                <div className="model-metrics">
                  <p>
                    <small>Accuracy</small>
                    <strong>{model.accuracy}</strong>
                  </p>
                  <p>
                    <small>Latency</small>
                    <strong>{model.latency}</strong>
                  </p>
                  <svg viewBox="0 0 120 34" aria-hidden="true">
                    <path d="M2 22 C12 7, 20 32, 30 13 S48 16, 55 7 S70 35, 78 17 S95 9, 104 23 S113 18, 118 9" />
                  </svg>
                </div>
                <small>Updated: {model.updated}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
