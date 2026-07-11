# How to Add a New IPC Channel

IPC lets the renderer (React) call into the main process (Node/Electron). There are three files to touch.

## 1. Expose the API in the preload

`src/preload/index.ts` is the security boundary. Add your new method to the `contextBridge.exposeInMainWorld` call:

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("visionGuard", {
  appName: "VisionGuard",

  // Add new methods here:
  openSettings: () => ipcRenderer.invoke("open-settings-window"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version")
});
```

Use `ipcRenderer.invoke` for request/response (returns a Promise).
Use `ipcRenderer.send` for fire-and-forget.

## 2. Handle the channel in the main process

Add the handler in `src/main/infrastructure/ipc/`. Create one file per logical group:

```ts
// src/main/infrastructure/ipc/app-ipc.ts
import { ipcMain, app } from "electron";

export function registerAppIpcHandlers() {
  ipcMain.handle("get-app-version", () => app.getVersion());
}
```

Then call `registerAppIpcHandlers()` from `src/main/main.ts` inside `app.whenReady()`.

## 3. Type the window API (optional but recommended)

Add a declaration file so TypeScript knows the shape of `window.visionGuard`:

```ts
// src/preload/contracts/visionguard-api.d.ts
interface VisionGuardAPI {
  appName: string;
  openSettings: () => Promise<void>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    visionGuard: VisionGuardAPI;
  }
}
```

## 4. Call it from the renderer

```tsx
// Any React component
const version = await window.visionGuard.getAppVersion();
```

Or wrap it in a custom hook inside `src/renderer/shared/hooks/`.

## Channel naming convention

Use `kebab-case` verbs: `get-app-version`, `open-settings-window`, `capture-gesture-frame`.
