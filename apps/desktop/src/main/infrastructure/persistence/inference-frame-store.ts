import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { app } from "electron";
import { sanitizePathSegment } from "./gesture-sample-store";

type CapturedInferenceFrame = {
  capturedAt: string;
  dataUrl: string;
  frameId: string;
};

type SavedInferenceFrame = {
  capturedAt: string;
  filePath: string;
  frameId: string;
};

const dataUrlPattern = /^data:image\/jpeg;base64,/;

export function getInferenceFrameDirectory(
  userDataPath = app.getPath("userData")
): string {
  return join(userDataPath, "visionguard", "inference-frames");
}

export async function saveInferenceFrame(
  frame: CapturedInferenceFrame,
  userDataPath?: string
): Promise<SavedInferenceFrame> {
  if (
    !frame ||
    typeof frame.frameId !== "string" ||
    typeof frame.capturedAt !== "string" ||
    !dataUrlPattern.test(frame.dataUrl)
  ) {
    throw new TypeError("Inference frame must be a JPEG data URL.");
  }

  const directory = getInferenceFrameDirectory(userDataPath);
  const frameId = sanitizePathSegment(frame.frameId);
  const filePath = join(directory, `${frameId}.jpg`);
  await mkdir(directory, { recursive: true });
  await writeFile(filePath, Buffer.from(frame.dataUrl.replace(dataUrlPattern, ""), "base64"));

  return {
    capturedAt: frame.capturedAt,
    filePath,
    frameId
  };
}
