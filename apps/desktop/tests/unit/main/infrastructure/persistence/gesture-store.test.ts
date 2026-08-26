import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => "/unused-electron-user-data"
  }
}));

const { getGestureStorePath, loadGestures, saveGestures } = await import(
  "../../../../../src/main/infrastructure/persistence/gesture-store"
);

describe("gesture-store", () => {
  let userDataPath: string;

  beforeEach(async () => {
    userDataPath = await mkdtemp(join(tmpdir(), "visionguard-gestures-"));
  });

  afterEach(async () => {
    await rm(userDataPath, { force: true, recursive: true });
  });

  it("returns null when no gesture store exists", async () => {
    await expect(loadGestures(userDataPath)).resolves.toBeNull();
  });

  it("saves gestures as a versioned JSON document and loads them back", async () => {
    const gestures = [
      {
        actionTarget: "Safari",
        actionType: "open-app",
        confidenceTarget: 92,
        createdAt: "2026-08-21T00:00:00.000Z",
        description: "Recorded from Desk Camera",
        id: "gesture-1",
        name: "Open Palm",
        sampleFiles: [],
        samples: 12,
        status: "ready"
      }
    ];

    await expect(saveGestures(gestures, userDataPath)).resolves.toEqual({ count: 1 });
    await expect(loadGestures(userDataPath)).resolves.toEqual(gestures);

    const saved = JSON.parse(await readFile(getGestureStorePath(userDataPath), "utf8"));
    expect(saved).toMatchObject({
      gestures,
      schemaVersion: 1
    });
    expect(typeof saved.updatedAt).toBe("string");
  });

  it("rejects non-array gesture payloads", async () => {
    await expect(saveGestures({ invalid: true } as never, userDataPath)).rejects.toThrow(
      "Gestures payload must be an array."
    );
  });
});
