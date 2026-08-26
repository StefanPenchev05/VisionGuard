import type { InferenceResult, ModelStatus } from "@visionguard/shared-kernel/contracts/ai";

type ModelHealthProps = {
  aiServiceStatus: {
    errorMessage?: string;
    modelStatus?: ModelStatus;
    ok: boolean;
    serviceUrl: string;
  };
  trainedGestureCount: number;
  inferenceResult: InferenceResult | null;
  inferenceStatus: "idle" | "running" | "error";
  errorMessage: string | null;
};

export function ModelHealth({
  aiServiceStatus,
  errorMessage,
  inferenceResult,
  inferenceStatus,
  trainedGestureCount
}: ModelHealthProps) {
  const modelState = aiServiceStatus.ok
    ? aiServiceStatus.modelStatus?.status ?? "unknown"
    : "offline";
  const statusText = !aiServiceStatus.ok
    ? "Offline"
    : aiServiceStatus.modelStatus?.status === "ready"
      ? "Ready"
      : "Not trained";
  const visibleError = aiServiceStatus.errorMessage ?? errorMessage;

  return (
    <section className="panel model-health">
      <h2>Model Health</h2>
      <div className="model-grid">
        <div className="model-card">
          <div className="model-icon">GR</div>
          <div className="model-content">
            <div className="model-title">
              <strong>Gesture Recognition</strong>
              <span className={aiServiceStatus.ok ? "" : "warning"}>{statusText}</span>
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
                <strong>{visibleError ? "Error" : modelState}</strong>
              </div>
            </div>
            <small>{aiServiceStatus.serviceUrl}</small>
            {visibleError ? <small>{visibleError}</small> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
