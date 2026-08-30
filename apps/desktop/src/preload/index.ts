import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("visionGuard", {
  appName: "VisionGuard",
  settings: {
    load: () => ipcRenderer.invoke("settings:load"),
    save: (settings: unknown) => ipcRenderer.invoke("settings:save", settings)
  },
  gestures: {
    load: () => ipcRenderer.invoke("gestures:load"),
    save: (gestures: unknown[]) => ipcRenderer.invoke("gestures:save", gestures)
  },
  samples: {
    deleteGesture: (gestureId: string) =>
      ipcRenderer.invoke("gesture-samples:delete-gesture", gestureId),
    saveBatch: (gestureId: string, samples: unknown[]) =>
      ipcRenderer.invoke("gesture-samples:save-batch", gestureId, samples)
  },
  inference: {
    detectHandFrame: (frame: unknown) =>
      ipcRenderer.invoke("inference:detect-hand-frame", frame),
    runGestureFrame: (frame: unknown) =>
      ipcRenderer.invoke("inference:run-gesture-frame", frame)
  },
  actions: {
    executeGesture: (action: unknown) =>
      ipcRenderer.invoke("actions:execute-gesture", action)
  },
  aiService: {
    getStatus: () => ipcRenderer.invoke("ai-service:get-status")
  },
  training: {
    getJob: (jobId: string) =>
      ipcRenderer.invoke("training:get-job", jobId),
    startGesture: (gesture: unknown) =>
      ipcRenderer.invoke("training:start-gesture", gesture)
  }
});
