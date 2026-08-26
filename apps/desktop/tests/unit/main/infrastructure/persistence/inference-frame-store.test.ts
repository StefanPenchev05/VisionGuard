import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => "/unused-electron-user-data"
  }
}));

const { getInferenceFrameDirectory, saveInferenceFrame } = await import(
  "../../../../../src/main/infrastructure/persistence/inference-frame-store"
);

describe("inference-frame-store", () => {
  let userDataPath: string;

  beforeEach(async () => {
    userDataPath = await mkdtemp(join(tmpdir(), "visionguard-inference-frames-"));
  });

  afterEach(async () => {
    await rm(userDataPath, { force: true, recursive: true });
  });

  it("writes a JPEG inference frame and returns a file reference", async () => {
    const jpegBytes = Buffer.from("fake-inference-frame");
    const savedFrame = await saveInferenceFrame(
      {
        capturedAt: "2026-08-26T00:00:00.000Z",
        dataUrl: `data:image/jpeg;base64,${jpegBytes.toString("base64")}`,
        frameId: "frame/one"
      },
      userDataPath
    );

    expect(savedFrame).toMatchObject({
      capturedAt: "2026-08-26T00:00:00.000Z",
      frameId: "frame_one"
    });
    expect(basename(savedFrame.filePath)).toBe("frame_one.jpg");
    expect(savedFrame.filePath).toContain(getInferenceFrameDirectory(userDataPath));
    expect(await readFile(savedFrame.filePath)).toEqual(jpegBytes);
  });

  it("rejects non-JPEG frame payloads", async () => {
    await expect(
      saveInferenceFrame(
        {
          capturedAt: "2026-08-26T00:00:00.000Z",
          dataUrl: "data:image/png;base64,aaaa",
          frameId: "frame-1"
        },
        userDataPath
      )
    ).rejects.toThrow("Inference frame must be a JPEG data URL.");
  });
});
