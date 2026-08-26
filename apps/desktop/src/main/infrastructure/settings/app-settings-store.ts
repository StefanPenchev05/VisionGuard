import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { app } from "electron";

export type AppSettings = {
  aiServiceUrl: string;
};

const defaultSettings: AppSettings = {
  aiServiceUrl: "http://127.0.0.1:8765"
};

type PersistedAppSettings = {
  schemaVersion: 1;
  settings: AppSettings;
  updatedAt: string;
};

export function getDefaultAppSettings(): AppSettings {
  return { ...defaultSettings };
}

export function getAppSettingsPath(userDataPath = app.getPath("userData")): string {
  return join(userDataPath, "visionguard", "settings.json");
}

function normalizeUrl(value: string): string {
  const parsed = new URL(value.trim());

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new TypeError("AI service URL must use http or https.");
  }

  return parsed.toString().replace(/\/$/, "");
}

export async function loadAppSettings(userDataPath?: string): Promise<AppSettings> {
  try {
    const contents = await readFile(getAppSettingsPath(userDataPath), "utf8");
    const parsed = JSON.parse(contents) as Partial<PersistedAppSettings>;

    return {
      aiServiceUrl: normalizeUrl(
        parsed.settings?.aiServiceUrl ?? defaultSettings.aiServiceUrl
      )
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return getDefaultAppSettings();
    }

    throw error;
  }
}

export async function saveAppSettings(
  settings: Partial<AppSettings>,
  userDataPath?: string
): Promise<AppSettings> {
  const normalizedSettings: AppSettings = {
    aiServiceUrl: normalizeUrl(settings.aiServiceUrl ?? defaultSettings.aiServiceUrl)
  };
  const storePath = getAppSettingsPath(userDataPath);
  const payload: PersistedAppSettings = {
    schemaVersion: 1,
    settings: normalizedSettings,
    updatedAt: new Date().toISOString()
  };

  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return normalizedSettings;
}

export async function getAiServiceBaseUrl(): Promise<string> {
  return process.env.VISIONGUARD_AI_SERVICE_URL ?? (await loadAppSettings()).aiServiceUrl;
}
