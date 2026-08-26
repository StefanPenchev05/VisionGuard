import { HttpAiModelClient } from "../../infrastructure/ai-client";
import { saveInferenceFrame } from "../../infrastructure/persistence/inference-frame-store";

type CapturedInferenceFrameRequest = {
  capturedAt: string;
  dataUrl: string;
  frameId: string;
  minConfidence?: number;
  modelId?: string;
};

function getAiServiceBaseUrl(): string {
  return process.env.VISIONGUARD_AI_SERVICE_URL ?? "http://127.0.0.1:8765";
}

export async function runGestureInferenceFrame(request: unknown) {
  const frame = request as Partial<CapturedInferenceFrameRequest>;

  if (
    !frame ||
    typeof frame.frameId !== "string" ||
    typeof frame.capturedAt !== "string" ||
    typeof frame.dataUrl !== "string"
  ) {
    throw new TypeError("Gesture inference frame payload is invalid.");
  }

  const savedFrame = await saveInferenceFrame({
    capturedAt: frame.capturedAt,
    dataUrl: frame.dataUrl,
    frameId: frame.frameId
  });
  const client = new HttpAiModelClient({
    baseUrl: getAiServiceBaseUrl(),
    requestTimeoutMs: 5_000
  });

  return client.runGestureInference({
    frame: savedFrame,
    minConfidence: frame.minConfidence,
    modelId: frame.modelId ?? "default"
  });
}
