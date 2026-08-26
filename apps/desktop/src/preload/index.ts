import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("visionGuard", {
  appName: "VisionGuard",
  gestures: {
    load: () => ipcRenderer.invoke("gestures:load"),
    save: (gestures: unknown[]) => ipcRenderer.invoke("gestures:save", gestures)
  },
  samples: {
    saveBatch: (gestureId: string, samples: unknown[]) =>
      ipcRenderer.invoke("gesture-samples:save-batch", gestureId, samples)
  }
});
