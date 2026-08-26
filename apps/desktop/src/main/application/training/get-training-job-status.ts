import { HttpAiModelClient } from "../../infrastructure/ai-client";
import { getAiServiceBaseUrl } from "../../infrastructure/settings/app-settings-store";

export async function getTrainingJobStatus(jobId: unknown) {
  if (typeof jobId !== "string" || jobId.trim().length === 0) {
    throw new TypeError("Training job id is required.");
  }

  const client = new HttpAiModelClient({
    baseUrl: await getAiServiceBaseUrl(),
    requestTimeoutMs: 5_000
  });

  return client.getTrainingJob(jobId);
}
