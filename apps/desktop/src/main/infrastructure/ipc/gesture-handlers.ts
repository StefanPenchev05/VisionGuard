import { ipcMain } from "electron";
import { loadGestures, saveGestures } from "../persistence/gesture-store";

export function registerGestureHandlers(): void {
  ipcMain.handle("gestures:load", async () => loadGestures());
  ipcMain.handle("gestures:save", async (_event, gestures: unknown[]) =>
    saveGestures(gestures)
  );
}
