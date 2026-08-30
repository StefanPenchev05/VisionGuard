import { access, readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => "/unused-electron-user-data"
  }
}));

const {
  deleteGestureSamples,
  getSampleDirectory,
  sanitizePathSegment,
  saveGestureSamples
} = await import(
  "../../../../../src/main/infrastructure/persistence/gesture-sample-store"
);

describe("gesture-sample-store", () => {
  let userDataPath: string;

  beforeEach(async () => {
    userDataPath = await mkdtemp(join(tmpdir(), "visionguard-samples-"));
  });

  afterEach(async () => {
    await rm(userDataPath, { force: true, recursive: true });
  });

  it("sanitizes path segments before writing sample files", async () => {
    expect(sanitizePathSegment("../bad gesture:id")).toBe("___bad_gesture_id");
  });

  it("writes JPEG data URLs as numbered sample files", async () => {
    const jpegBytes = Buffer.from("fake-jpeg-frame");
    const dataUrl = `data:image/jpeg;base64,${jpegBytes.toString("base64")}`;

    const savedSamples = await saveGestureSamples(
      "gesture/with unsafe:name",
      [
        {
          capturedAt: "2026-08-21T00:00:00.000Z",
          dataUrl,
          id: "sample/one"
        }
      ],
      userDataPath
    );

    expect(savedSamples).toHaveLength(1);
    expect(savedSamples[0]).toMatchObject({
      capturedAt: "2026-08-21T00:00:00.000Z",
      id: "sample_one"
    });
    expect(basename(savedSamples[0].filePath)).toBe("001-sample_one.jpg");
    expect(await readFile(savedSamples[0].filePath)).toEqual(jpegBytes);
    expect(getSampleDirectory("gesture_with_unsafe_name", userDataPath)).toContain(
      "gesture_with_unsafe_name"
    );
  });

  it("rejects non-JPEG sample payloads", async () => {
    await expect(
      saveGestureSamples(
        "gesture-1",
        [
          {
            capturedAt: "2026-08-21T00:00:00.000Z",
            dataUrl: "data:image/png;base64,aaaa",
            id: "sample-1"
          }
        ],
        userDataPath
      )
    ).rejects.toThrow("Gesture samples must be JPEG data URLs.");
  });

  it("deletes all saved sample files for a gesture", async () => {
    const jpegBytes = Buffer.from("fake-jpeg-frame");
    const dataUrl = `data:image/jpeg;base64,${jpegBytes.toString("base64")}`;
    const [savedSample] = await saveGestureSamples(
      "gesture-1",
      [
        {
          capturedAt: "2026-08-21T00:00:00.000Z",
          dataUrl,
          id: "sample-1"
        }
      ],
      userDataPath
    );

    await expect(access(savedSample.filePath)).resolves.toBeUndefined();
    await expect(deleteGestureSamples("gesture-1", userDataPath)).resolves.toEqual({
      deleted: true
    });
    await expect(access(savedSample.filePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });
});
