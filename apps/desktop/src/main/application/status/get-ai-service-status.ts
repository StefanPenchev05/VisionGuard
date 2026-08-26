import type { ModelStatus } from "@visionguard/shared-kernel/contracts/ai";
import { HttpAiModelClient } from "../../infrastructure/ai-client";
import { getAiServiceBaseUrl } from "../../infrastructure/settings/app-settings-store";

export type AiServiceStatus = {
  checkedAt: string;
  errorMessage?: string;
  modelStatus?: ModelStatus;
  ok: boolean;
  serviceUrl: string;
};

export async function getAiServiceStatus(): Promise<AiServiceStatus> {
  const serviceUrl = await getAiServiceBaseUrl();
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(new URL("/health", serviceUrl), {
      signal: AbortSignal.timeout(2_000)
    });

    if (!response.ok) {
      throw new Error(`AI service health check failed: ${response.status}`);
    }

    const client = new HttpAiModelClient({
      baseUrl: serviceUrl,
      requestTimeoutMs: 2_000
    });

    return {
      checkedAt,
      modelStatus: await client.getModelStatus("default"),
      ok: true,
      serviceUrl
    };
  } catch (error) {
    return {
      checkedAt,
      errorMessage: error instanceof Error ? error.message : "AI service is offline.",
      ok: false,
      serviceUrl
    };
  }
}
