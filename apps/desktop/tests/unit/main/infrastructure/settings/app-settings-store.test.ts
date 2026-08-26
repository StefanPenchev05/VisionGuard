import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => "/unused-electron-user-data"
  }
}));

const { getAppSettingsPath, loadAppSettings, saveAppSettings } = await import(
  "../../../../../src/main/infrastructure/settings/app-settings-store"
);

describe("app-settings-store", () => {
  let userDataPath: string;

  beforeEach(async () => {
    userDataPath = await mkdtemp(join(tmpdir(), "visionguard-settings-"));
  });

  afterEach(async () => {
    await rm(userDataPath, { force: true, recursive: true });
  });

  it("returns default settings when no settings file exists", async () => {
    await expect(loadAppSettings(userDataPath)).resolves.toEqual({
      aiServiceUrl: "http://127.0.0.1:8765"
    });
  });

  it("saves normalized AI service settings", async () => {
    await expect(
      saveAppSettings({ aiServiceUrl: "http://127.0.0.1:9000/" }, userDataPath)
    ).resolves.toEqual({
      aiServiceUrl: "http://127.0.0.1:9000"
    });

    await expect(loadAppSettings(userDataPath)).resolves.toEqual({
      aiServiceUrl: "http://127.0.0.1:9000"
    });

    const saved = JSON.parse(await readFile(getAppSettingsPath(userDataPath), "utf8"));
    expect(saved).toMatchObject({
      schemaVersion: 1,
      settings: {
        aiServiceUrl: "http://127.0.0.1:9000"
      }
    });
  });

  it("rejects unsupported URL protocols", async () => {
    await expect(
      saveAppSettings({ aiServiceUrl: "file:///tmp/service" }, userDataPath)
    ).rejects.toThrow("AI service URL must use http or https.");
  });
});
