import { ipcMain } from "electron";
import { executeGestureAction } from "../../application/actions/execute-gesture-action";
import { runGestureInferenceFrame } from "../../application/inference/run-gesture-inference-frame";
import { getTrainingJobStatus } from "../../application/training/get-training-job-status";
import { startGestureTraining } from "../../application/training/start-gesture-training";
import { saveGestureSamples } from "../persistence/gesture-sample-store";
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
  ipcMain.handle("training:start-gesture", async (_event, gesture: unknown) =>
    startGestureTraining(gesture)
  );
  ipcMain.handle("training:get-job", async (_event, jobId: unknown) =>
    getTrainingJobStatus(jobId)
  );
  ipcMain.handle("inference:run-gesture-frame", async (_event, frame: unknown) =>
    runGestureInferenceFrame(frame)
  );
  ipcMain.handle("actions:execute-gesture", async (_event, action: unknown) =>
    executeGestureAction(action)
  );
}
