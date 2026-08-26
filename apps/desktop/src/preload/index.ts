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
  },
  inference: {
    runGestureFrame: (frame: unknown) =>
      ipcRenderer.invoke("inference:run-gesture-frame", frame)
  },
  actions: {
    executeGesture: (action: unknown) =>
      ipcRenderer.invoke("actions:execute-gesture", action)
  },
  training: {
    getJob: (jobId: string) =>
      ipcRenderer.invoke("training:get-job", jobId),
    startGesture: (gesture: unknown) =>
      ipcRenderer.invoke("training:start-gesture", gesture)
  }
});
