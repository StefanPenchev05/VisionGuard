import { HttpAiModelClient } from "../../infrastructure/ai-client";

function getAiServiceBaseUrl(): string {
  return process.env.VISIONGUARD_AI_SERVICE_URL ?? "http://127.0.0.1:8765";
}

export async function getTrainingJobStatus(jobId: unknown) {
  if (typeof jobId !== "string" || jobId.trim().length === 0) {
    throw new TypeError("Training job id is required.");
  }

  const client = new HttpAiModelClient({
    baseUrl: getAiServiceBaseUrl(),
    requestTimeoutMs: 5_000
  });

  return client.getTrainingJob(jobId);
}
