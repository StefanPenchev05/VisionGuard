import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { app } from "electron";

type PersistedGestureStore = {
  gestures: unknown[];
  schemaVersion: 1;
  updatedAt: string;
};

export function getGestureStorePath(userDataPath = app.getPath("userData")): string {
  return join(userDataPath, "visionguard", "gestures.json");
}

export async function loadGestures(userDataPath?: string): Promise<unknown[] | null> {
  try {
    const contents = await readFile(getGestureStorePath(userDataPath), "utf8");
    const parsed = JSON.parse(contents) as Partial<PersistedGestureStore>;

    return Array.isArray(parsed.gestures) ? parsed.gestures : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function saveGestures(
  gestures: unknown[],
  userDataPath?: string
): Promise<{ count: number }> {
  if (!Array.isArray(gestures)) {
    throw new TypeError("Gestures payload must be an array.");
  }

  const storePath = getGestureStorePath(userDataPath);
  const payload: PersistedGestureStore = {
    gestures,
    schemaVersion: 1,
    updatedAt: new Date().toISOString()
  };

  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return { count: gestures.length };
}
