import { ipcMain } from "electron";
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
}
