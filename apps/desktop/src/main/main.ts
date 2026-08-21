import { app, BrowserWindow, session } from "electron";
import { registerGestureHandlers } from "./infrastructure/ipc/gesture-handlers";
import { createMainWindow } from "./presentation/windows/create-main-window";

const isMac = process.platform === "darwin";

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });

  registerGestureHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});
