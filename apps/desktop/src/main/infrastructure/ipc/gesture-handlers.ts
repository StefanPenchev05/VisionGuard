import { ipcMain } from "electron";
import { executeGestureAction } from "../../application/actions/execute-gesture-action";
import { detectHandFrame } from "../../application/inference/detect-hand-frame";
import { runGestureInferenceFrame } from "../../application/inference/run-gesture-inference-frame";
import { getAiServiceStatus } from "../../application/status/get-ai-service-status";
import { getTrainingJobStatus } from "../../application/training/get-training-job-status";
import { startGestureTraining } from "../../application/training/start-gesture-training";
import { deleteGestureSamples, saveGestureSamples } from "../persistence/gesture-sample-store";
import { loadGestures, saveGestures } from "../persistence/gesture-store";

export function registerGestureHandlers(): void {
  ipcMain.handle("gestures:load", async () => loadGestures());
  ipcMain.handle("gestures:save", async (_event, gestures: unknown[]) =>
    saveGestures(gestures)
  );
  ipcMain.handle(
    "gesture-samples:save-batch",
    async (_event, gestureId: string, samples: unknown[]) =>
      saveGestureSamples(gestureId, samples as Parameters<typeof saveGestureSamples>[1])
  );
  ipcMain.handle("gesture-samples:delete-gesture", async (_event, gestureId: string) =>
    deleteGestureSamples(gestureId)
  );
  ipcMain.handle("training:start-gesture", async (_event, gesture: unknown) =>
    startGestureTraining(gesture)
  );
  ipcMain.handle("training:get-job", async (_event, jobId: unknown) =>
    getTrainingJobStatus(jobId)
  );
  ipcMain.handle("inference:run-gesture-frame", async (_event, frame: unknown) =>
    runGestureInferenceFrame(frame)
  );
  ipcMain.handle("inference:detect-hand-frame", async (_event, frame: unknown) =>
    detectHandFrame(frame)
  );
  ipcMain.handle("actions:execute-gesture", async (_event, action: unknown) =>
    executeGestureAction(action)
  );
  ipcMain.handle("ai-service:get-status", async () => getAiServiceStatus());
}
