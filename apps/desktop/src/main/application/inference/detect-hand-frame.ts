import { HttpAiModelClient } from "../../infrastructure/ai-client";
import { saveInferenceFrame } from "../../infrastructure/persistence/inference-frame-store";
import { getAiServiceBaseUrl } from "../../infrastructure/settings/app-settings-store";

type CapturedHandFrameRequest = {
  capturedAt: string;
  dataUrl: string;
  frameId: string;
};

export async function detectHandFrame(request: unknown) {
  const frame = request as Partial<CapturedHandFrameRequest>;

  if (
    !frame ||
    typeof frame.frameId !== "string" ||
    typeof frame.capturedAt !== "string" ||
    typeof frame.dataUrl !== "string"
  ) {
    throw new TypeError("Hand detection frame payload is invalid.");
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

  return client.detectHandPresence({
    frame: savedFrame
  });
}
