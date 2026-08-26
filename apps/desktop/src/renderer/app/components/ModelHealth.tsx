import type { InferenceResult } from "@visionguard/shared-kernel/contracts/ai";

type ModelHealthProps = {
  trainedGestureCount: number;
  inferenceResult: InferenceResult | null;
  inferenceStatus: "idle" | "running" | "error";
  errorMessage: string | null;
};

export function ModelHealth({
  errorMessage,
  inferenceResult,
  inferenceStatus,
  trainedGestureCount
}: ModelHealthProps) {
  return (
    <section className="panel model-health">
      <h2>Model Health</h2>
      <div className="model-grid">
        <div className="model-card">
          <div className="model-icon">GR</div>
          <div className="model-content">
            <div className="model-title">
              <strong>Gesture Recognition</strong>
              <span>{trainedGestureCount > 0 ? "Ready" : "Waiting"}</span>
            </div>
            <div className="model-metrics">
              <div>
                <small>Gestures</small>
                <strong>{trainedGestureCount}</strong>
              </div>
              <div>
                <small>Latency</small>
                <strong>
                  {inferenceResult ? `${Math.round(inferenceResult.inferenceTimeMs)}ms` : "--"}
                </strong>
              </div>
              <div>
                <small>Status</small>
                <strong>{errorMessage ? "Error" : inferenceStatus}</strong>
              </div>
            </div>
            {errorMessage ? <small>{errorMessage}</small> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
