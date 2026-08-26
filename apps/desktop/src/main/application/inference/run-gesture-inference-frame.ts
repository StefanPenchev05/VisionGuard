import { HttpAiModelClient } from "../../infrastructure/ai-client";
import { saveInferenceFrame } from "../../infrastructure/persistence/inference-frame-store";
import { getAiServiceBaseUrl } from "../../infrastructure/settings/app-settings-store";

type CapturedInferenceFrameRequest = {
  capturedAt: string;
  dataUrl: string;
  frameId: string;
  minConfidence?: number;
  modelId?: string;
};

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
    baseUrl: await getAiServiceBaseUrl(),
    requestTimeoutMs: 5_000
  });

  return client.runGestureInference({
    frame: savedFrame,
    minConfidence: frame.minConfidence,
    modelId: frame.modelId ?? "default"
  });
}
