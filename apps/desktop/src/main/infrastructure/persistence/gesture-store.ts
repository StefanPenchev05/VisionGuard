import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { app } from "electron";

type PersistedGestureStore = {
  gestures: unknown[];
  schemaVersion: 1;
  updatedAt: string;
};

function getGestureStorePath(): string {
  return join(app.getPath("userData"), "visionguard", "gestures.json");
}

export async function loadGestures(): Promise<unknown[] | null> {
  try {
    const contents = await readFile(getGestureStorePath(), "utf8");
    const parsed = JSON.parse(contents) as Partial<PersistedGestureStore>;

    return Array.isArray(parsed.gestures) ? parsed.gestures : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function saveGestures(gestures: unknown[]): Promise<{ count: number }> {
  if (!Array.isArray(gestures)) {
    throw new TypeError("Gestures payload must be an array.");
  }

  const storePath = getGestureStorePath();
  const payload: PersistedGestureStore = {
    gestures,
    schemaVersion: 1,
    updatedAt: new Date().toISOString()
  };

  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return { count: gestures.length };
}
