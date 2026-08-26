import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpAiModelClient } from "../../../../../src/main/infrastructure/ai-client";

describe("HttpAiModelClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts dataset creation requests to the AI service", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          createdAt: "2026-08-21T00:00:00.000Z",
          id: "dataset-1",
          labels: [],
          name: "Desktop Gestures",
          sampleCount: 0,
          updatedAt: "2026-08-21T00:00:00.000Z"
        }),
        { status: 200 }
      )
    );

    const client = new HttpAiModelClient({
      baseUrl: "http://127.0.0.1:8765",
      requestTimeoutMs: 1000
    });

    const dataset = await client.createTrainingDataset({
      labels: [],
      name: "Desktop Gestures",
      samples: []
    });

    expect(dataset.id).toBe("dataset-1");
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://127.0.0.1:8765/datasets"),
      expect.objectContaining({
        body: JSON.stringify({
          labels: [],
          name: "Desktop Gestures",
          samples: []
        }),
        method: "POST"
      })
    );
  });

  it("surfaces non-2xx responses as client errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "failed" }), {
        status: 500,
        statusText: "Internal Server Error"
      })
    );

    const client = new HttpAiModelClient({
      baseUrl: "http://127.0.0.1:8765"
    });

    await expect(client.listDatasets()).rejects.toMatchObject({
      name: "AiModelClientError",
      status: 500
    });
  });
});
