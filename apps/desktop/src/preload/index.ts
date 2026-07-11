import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("visionGuard", {
  appName: "VisionGuard"
});
