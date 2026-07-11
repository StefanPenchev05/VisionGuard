# How to Add a New Electron Window

Electron windows are created in `apps/desktop/src/main/presentation/windows/`.

## 1. Create the window factory

Follow the pattern of `create-main-window.ts`:

```ts
// src/main/presentation/windows/create-settings-window.ts
import { join } from "node:path";
import { BrowserWindow } from "electron";

export function createSettingsWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Settings",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}
```

## 2. Open the window from main.ts

Import and call the factory from `src/main/main.ts`, typically in response to an IPC call or a menu click:

```ts
import { createSettingsWindow } from "./presentation/windows/create-settings-window";

// Example: open when triggered via IPC
ipcMain.handle("open-settings-window", () => {
  createSettingsWindow();
});
```

## Multiple windows with different content

The current setup loads a single React app (`index.html`) in every window. To show different UI per window:

- **Option A – React Router**: add routes in the renderer and navigate to the correct path when the window opens.
- **Option B – Separate HTML entry**: add a second entry point in `electron.vite.config.ts` and a second HTML file.

Option A is simpler and recommended for most cases.

## Notes

- Always set `contextIsolation: true` and `nodeIntegration: false` for security.
- Keep the preload path pointing to `../preload/index.mjs`.
