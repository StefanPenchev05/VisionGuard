import { ipcMain } from "electron";
import { loadAppSettings, saveAppSettings } from "../settings/app-settings-store";

export function registerSettingsHandlers(): void {
  ipcMain.handle("settings:load", async () => loadAppSettings());
  ipcMain.handle("settings:save", async (_event, settings: unknown) => {
    if (!settings || typeof settings !== "object") {
      throw new TypeError("Settings payload is invalid.");
    }

    return saveAppSettings(settings);
  });
}
