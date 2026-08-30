import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { app } from "electron";

type CapturedGestureSample = {
  capturedAt: string;
  dataUrl: string;
  handDetected?: boolean;
  handDetectionConfidence?: number | null;
  handLandmarkCount?: number | null;
  height?: number;
  id: string;
  width?: number;
};

type SavedGestureSample = {
  capturedAt: string;
  filePath: string;
  handDetected?: boolean;
  handDetectionConfidence?: number | null;
  handLandmarkCount?: number | null;
  height?: number;
  id: string;
  width?: number;
};

const dataUrlPattern = /^data:image\/jpeg;base64,/;

export function getSampleDirectory(
  gestureId: string,
  userDataPath = app.getPath("userData")
): string {
  return join(userDataPath, "visionguard", "gesture-samples", gestureId);
}

export function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function saveGestureSamples(
  gestureId: string,
  samples: CapturedGestureSample[],
  userDataPath?: string
): Promise<SavedGestureSample[]> {
  if (!gestureId || !Array.isArray(samples)) {
    throw new TypeError("Gesture sample payload is invalid.");
  }

  const safeGestureId = sanitizePathSegment(gestureId);
  const sampleDirectory = getSampleDirectory(safeGestureId, userDataPath);
  await mkdir(sampleDirectory, { recursive: true });

  return Promise.all(
    samples.map(async (sample, index) => {
      if (!dataUrlPattern.test(sample.dataUrl)) {
        throw new TypeError("Gesture samples must be JPEG data URLs.");
      }

      const sampleId = sanitizePathSegment(sample.id || `sample-${index + 1}`);
      const filePath = join(sampleDirectory, `${String(index + 1).padStart(3, "0")}-${sampleId}.jpg`);
      const base64 = sample.dataUrl.replace(dataUrlPattern, "");
      await writeFile(filePath, Buffer.from(base64, "base64"));

      return {
        capturedAt: sample.capturedAt,
        filePath,
        handDetected: sample.handDetected,
        handDetectionConfidence: sample.handDetectionConfidence,
        handLandmarkCount: sample.handLandmarkCount,
        height: sample.height,
        id: sampleId,
        width: sample.width
      };
    })
  );
}

export async function deleteGestureSamples(
  gestureId: string,
  userDataPath?: string
): Promise<{ deleted: boolean }> {
  if (!gestureId) {
    throw new TypeError("Gesture id is required.");
  }

  await rm(getSampleDirectory(sanitizePathSegment(gestureId), userDataPath), {
    force: true,
    recursive: true
  });

  return { deleted: true };
}
