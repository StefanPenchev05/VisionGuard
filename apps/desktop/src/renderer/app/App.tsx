import { useCallback, useEffect, useRef, useState } from "react";
import type { InferenceResult, ModelStatus, TrainingJob } from "@visionguard/shared-kernel/contracts/ai";
import { AppShell } from "./components/AppShell";
import { CalibrationModal } from "./components/CalibrationModal";
import type { CalibrationResult } from "./components/CalibrationModal";
import { EventTimeline } from "./components/EventTimeline";
import type { TimelineEvent } from "./components/EventTimeline";
import { GesturesPanel } from "./components/GesturesPanel";
import { IdentityPanel } from "./components/IdentityPanel";
import { LiveVisionPanel } from "./components/LiveVisionPanel";
import { ModelHealth } from "./components/ModelHealth";
import { SecondaryViews } from "./components/SecondaryViews";
import { decideActionExecution } from "./services/live-inference-decision";
import { useCameraStream } from "../shared/hooks/useCameraStream";
import { usePersistentGestures } from "../shared/hooks/usePersistentGestures";
import type { AppView } from "./data";
import type { GestureDefinition, GestureSample } from "./types/gestures";

const initialGestures: GestureDefinition[] = [
  {
    id: "gesture-open-palm",
    actionTarget: "Safari",
    actionType: "open-app",
    confidenceTarget: 92,
    createdAt: new Date().toISOString(),
    description: "Baseline hand-open gesture for app launch",
    name: "Open Palm",
    sampleFiles: [],
    samples: 18,
    status: "ready"
  },
  {
    id: "gesture-swipe-down",
    actionTarget: "System volume -10%",
    actionType: "volume-down",
    confidenceTarget: 90,
    createdAt: new Date().toISOString(),
    description: "Downward hand movement mapped to volume control",
    name: "Swipe Down",
    sampleFiles: [],
    samples: 14,
    status: "ready"
  },
  {
    id: "gesture-closed-fist",
    actionTarget: "Toggle mute",
    actionType: "mute",
    confidenceTarget: 94,
    createdAt: new Date().toISOString(),
    description: "Closed-fist hold for audio mute",
    name: "Closed Fist",
    sampleFiles: [],
    samples: 7,
    status: "draft"
  }
];

const LIVE_INFERENCE_MIN_CONFIDENCE = 0.75;
const ACTION_EXECUTION_MIN_CONFIDENCE = 0.92;
const ACTION_COOLDOWN_MS = 4_000;

type CapturedGestureSample = {
  capturedAt: string;
  dataUrl: string;
  handDetected?: boolean;
  handDetectionConfidence?: number | null;
  handLandmarkCount?: number | null;
  height?: number;
  id: string;
  width?: number;
};

type CapturedInferenceFrame = {
  capturedAt: string;
  dataUrl: string;
  frameId: string;
};

type AppSettings = {
  aiServiceUrl: string;
};

type AiServiceStatus = {
  checkedAt: string;
  errorMessage?: string;
  modelStatus?: ModelStatus;
  ok: boolean;
  serviceUrl: string;
};

type ActionExecutionState = {
  message: string;
  status: "idle" | "executing" | "success" | "warning";
};

function mapTrainingJobToGestureStatus(job: TrainingJob): GestureDefinition["status"] {
  if (job.status === "completed") {
    return "trained";
  }

  if (job.status === "failed" || job.status === "cancelled") {
    return "training-failed";
  }

  return "training";
}

function formatEventTime(date = new Date()): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function App() {
  const camera = useCameraStream();
  const inferenceInFlightRef = useRef(false);
  const lastActionAtRef = useRef<Record<string, number>>({});
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
  const [activeView, setActiveView] = useState<AppView>("Monitor");
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [inferenceStatus, setInferenceStatus] = useState<"idle" | "running" | "error">("idle");
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [areActionsArmed, setAreActionsArmed] = useState(false);
  const [actionExecutionState, setActionExecutionState] = useState<ActionExecutionState>({
    message: "Actions disarmed",
    status: "idle"
  });
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    aiServiceUrl: "http://127.0.0.1:8765"
  });
  const [settingsStatus, setSettingsStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [aiServiceStatus, setAiServiceStatus] = useState<AiServiceStatus>({
    checkedAt: new Date().toISOString(),
    ok: false,
    serviceUrl: appSettings.aiServiceUrl
  });
  const {
    errorMessage: gesturePersistenceError,
    gestures: gestureDefinitions,
    setGestures: setGestureDefinitions,
    status: gesturePersistenceStatus
  } = usePersistentGestures(initialGestures);

  const handleExport = () => {
    const track = camera.stream?.getVideoTracks()[0];
    const settings = track?.getSettings();

    const payload = {
      exportedAt: new Date().toISOString(),
      camera: {
        active: camera.isCameraActive,
        selectedDeviceId: camera.selectedDeviceId,
        availableDevices: camera.devices.map((device) => ({
          deviceId: device.deviceId,
          groupId: device.groupId,
          label: device.label
        })),
        resolution: settings?.width && settings?.height
          ? `${settings.width}x${settings.height}`
          : null,
        frameRate: settings?.frameRate ?? null,
        deviceId: settings?.deviceId ?? null,
      },
      calibration: calibrationResult,
      gestures: gestureDefinitions,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `visionguard-session-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveGestureSamples = async (
    gestureId: string,
    samples: CapturedGestureSample[]
  ): Promise<GestureSample[]> => {
    if (window.visionGuard?.samples) {
      return window.visionGuard.samples.saveBatch(gestureId, samples);
    }

    return samples.map((sample) => ({
      capturedAt: sample.capturedAt,
      filePath: sample.dataUrl,
      handDetected: sample.handDetected,
      handDetectionConfidence: sample.handDetectionConfidence,
      handLandmarkCount: sample.handLandmarkCount,
      height: sample.height,
      id: sample.id,
      width: sample.width
    }));
  };

  const handleDeleteGesture = async (gestureId: string) => {
    if (window.visionGuard?.samples) {
      await window.visionGuard.samples.deleteGesture(gestureId);
    }

    setGestureDefinitions((current) =>
      current.filter((gesture) => gesture.id !== gestureId)
    );
  };

  const handleStartGestureTraining = async (gesture: GestureDefinition) => {
    if (!window.visionGuard?.training) {
      throw new Error("Training is available only in the Electron desktop app.");
    }

    const trainableGestures = gestureDefinitions.filter(
      (candidate) => candidate.sampleFiles.length >= 12
    );
    const trainingPayload = trainableGestures.some((candidate) => candidate.id === gesture.id)
      ? trainableGestures
      : [gesture, ...trainableGestures];

    return window.visionGuard.training.startGesture(trainingPayload);
  };

  const handleTestGestureAction = async (gesture: GestureDefinition) => {
    if (!window.visionGuard?.actions) {
      throw new Error("Action testing is available only in the Electron desktop app.");
    }

    return window.visionGuard.actions.executeGesture({
      actionTarget: gesture.actionTarget,
      actionType: gesture.actionType,
      gestureId: gesture.id
    });
  };

  const handleSaveSettings = async (settings: AppSettings) => {
    if (!window.visionGuard?.settings) {
      setAppSettings(settings);
      setSettingsStatus("ready");
      setSettingsError(null);
      return;
    }

    setSettingsStatus("saving");

    try {
      const savedSettings = await window.visionGuard.settings.save(settings);
      setAppSettings(savedSettings);
      setSettingsStatus("ready");
      setSettingsError(null);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not save settings.");
      setSettingsStatus("error");
    }
  };

  const trainedGestures = gestureDefinitions.filter((gesture) => gesture.status === "trained");
  const isInferenceEnabled = Boolean(
    camera.isCameraActive &&
    trainedGestures.length > 0 &&
    aiServiceStatus.ok &&
    aiServiceStatus.modelStatus?.status === "ready" &&
    window.visionGuard?.inference
  );

  const addTimelineEvent = useCallback((event: Omit<TimelineEvent, "id" | "time">) => {
    setTimelineEvents((current) => [
      {
        ...event,
        id: crypto.randomUUID(),
        time: formatEventTime()
      },
      ...current
    ].slice(0, 20));
  }, []);

  const handleToggleActionsArmed = useCallback(() => {
    setAreActionsArmed((current) => {
      const next = !current;
      lastActionAtRef.current = {};
      setActionExecutionState({
        message: next ? "Actions armed" : "Actions disarmed",
        status: next ? "success" : "idle"
      });
      return next;
    });
  }, []);

  const handleInferenceFrame = useCallback(
    async (frame: CapturedInferenceFrame) => {
      if (!window.visionGuard?.inference || !isInferenceEnabled || inferenceInFlightRef.current) {
        return;
      }

      inferenceInFlightRef.current = true;
      setInferenceStatus("running");

      try {
        const result = await window.visionGuard.inference.runGestureFrame({
          ...frame,
          minConfidence: LIVE_INFERENCE_MIN_CONFIDENCE,
          modelId: "default"
        });
        setInferenceResult(result);
        setInferenceError(null);
        setInferenceStatus("idle");

        const decision = decideActionExecution({
          actionCooldownMs: ACTION_COOLDOWN_MS,
          actionsArmed: areActionsArmed,
          lastActionAtByGestureId: lastActionAtRef.current,
          minConfidence: ACTION_EXECUTION_MIN_CONFIDENCE,
          now: Date.now(),
          prediction: result.bestPrediction,
          trainedGestures
        });

        if (!decision.shouldExecute) {
          if (decision.reason === "missing-prediction") {
            setActionExecutionState({
              message: "No gesture ready for action",
              status: "idle"
            });
          } else if (decision.reason === "low-confidence") {
            setActionExecutionState({
              message: `Gesture seen at ${Math.round(decision.prediction.confidence * 100)}%, waiting for ${Math.round(ACTION_EXECUTION_MIN_CONFIDENCE * 100)}%`,
              status: "idle"
            });
          } else if (decision.reason === "cooldown") {
            setActionExecutionState({
              message: `Cooldown ${Math.ceil(decision.remainingMs / 1000)}s`,
              status: "idle"
            });
          } else if (decision.reason === "actions-disarmed") {
            setActionExecutionState({
              message: "Actions disarmed - predictions only",
              status: "idle"
            });
          } else {
            setActionExecutionState({
              message: "Prediction does not match a trained gesture",
              status: "warning"
            });
          }
          return;
        }

        const now = Date.now();
        const matchedGesture = decision.gesture;
        const prediction = decision.prediction;
        lastActionAtRef.current[matchedGesture.id] = now;
        setActionExecutionState({
          message: `Executing ${matchedGesture.actionTarget}`,
          status: "executing"
        });

        if (!window.visionGuard.actions) {
          setActionExecutionState({
            message: "Action execution is available only in Electron",
            status: "warning"
          });
          addTimelineEvent({
            category: "gesture",
            confidence: prediction.confidence,
            details: "Action execution is available only in the Electron desktop app.",
            name: matchedGesture.name,
            source: "Inference",
            variant: "warning"
          });
          return;
        }

        const actionResult = await window.visionGuard.actions.executeGesture({
          actionTarget: matchedGesture.actionTarget,
          actionType: matchedGesture.actionType,
          gestureId: matchedGesture.id
        });

        setActionExecutionState({
          message: actionResult.message,
          status: actionResult.ok ? "success" : "warning"
        });

        addTimelineEvent({
          category: "gesture",
          confidence: prediction.confidence,
          details: actionResult.message,
          name: matchedGesture.name,
          source: matchedGesture.actionType,
          variant: actionResult.ok ? "success" : "warning"
        });
      } catch (error) {
        setInferenceStatus("error");
        const message = error instanceof Error ? error.message : "Gesture inference failed.";
        setInferenceError(message);
        setActionExecutionState({
          message,
          status: "warning"
        });
      } finally {
        inferenceInFlightRef.current = false;
      }
    },
    [addTimelineEvent, areActionsArmed, isInferenceEnabled, trainedGestures]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      if (!window.visionGuard?.settings) {
        setSettingsStatus("ready");
        return;
      }

      try {
        const savedSettings = await window.visionGuard.settings.load();

        if (!cancelled) {
          setAppSettings(savedSettings);
          setSettingsStatus("ready");
          setSettingsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setSettingsError(error instanceof Error ? error.message : "Could not load settings.");
          setSettingsStatus("error");
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!window.visionGuard?.aiService) {
      setAiServiceStatus({
        checkedAt: new Date().toISOString(),
        errorMessage: "AI service checks are available only in the Electron desktop app.",
        ok: false,
        serviceUrl: appSettings.aiServiceUrl
      });
      return;
    }

    let cancelled = false;

    const refreshAiServiceStatus = async () => {
      const status = await window.visionGuard!.aiService.getStatus();

      if (!cancelled) {
        setAiServiceStatus(status);
      }
    };

    void refreshAiServiceStatus();
    const intervalId = window.setInterval(refreshAiServiceStatus, 5_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [appSettings.aiServiceUrl]);

  useEffect(() => {
    if (!window.visionGuard?.training) {
      return;
    }

    const trainingGestures = gestureDefinitions.filter(
      (gesture) =>
        gesture.status === "training" &&
        gesture.training?.jobId &&
        gesture.training.jobStatus !== "completed" &&
        gesture.training.jobStatus !== "failed" &&
        gesture.training.jobStatus !== "cancelled"
    );

    if (trainingGestures.length === 0) {
      return;
    }

    let cancelled = false;

    const pollTrainingJobs = async () => {
      const results = await Promise.allSettled(
        trainingGestures.map(async (gesture) => ({
          gestureId: gesture.id,
          job: await window.visionGuard!.training.getJob(gesture.training!.jobId!)
        }))
      );

      if (cancelled) {
        return;
      }

      setGestureDefinitions((current) =>
        current.map((gesture) => {
          const result = results.find(
            (item) => item.status === "fulfilled" && item.value.gestureId === gesture.id
          );

          if (!result || result.status !== "fulfilled") {
            return gesture;
          }

          const { job } = result.value;
          const nextStatus = mapTrainingJobToGestureStatus(job);
          const hasJobChanged =
            gesture.status !== nextStatus ||
            gesture.training?.errorMessage !== job.errorMessage ||
            gesture.training?.jobId !== job.id ||
            gesture.training?.jobProgress !== job.progress ||
            gesture.training?.jobStatus !== job.status;

          if (!hasJobChanged) {
            return gesture;
          }

          return {
            ...gesture,
            status: nextStatus,
            training: {
              ...gesture.training,
              errorMessage: job.errorMessage,
              jobId: job.id,
              jobProgress: job.progress,
              jobStatus: job.status,
              updatedAt: new Date().toISOString()
            }
          };
        })
      );
    };

    void pollTrainingJobs();
    const intervalId = window.setInterval(pollTrainingJobs, 2_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [gestureDefinitions, setGestureDefinitions]);

  return (
    <>
      <AppShell
        activeView={activeView}
        cameraDevices={camera.devices}
        cameraStatusLabel={camera.statusLabel}
        isCameraActive={camera.isCameraActive}
        isCameraRequesting={camera.status === "requesting"}
        onCalibrate={() => setIsCalibrating(true)}
        onExport={handleExport}
        onRefreshCameras={camera.refreshDevices}
        onSelectCamera={camera.selectCamera}
        onToggleCamera={camera.toggleCamera}
        onViewChange={setActiveView}
        selectedCameraId={camera.selectedDeviceId}
      >
        {activeView === "Gestures" ? (
          <GesturesPanel
            gestures={gestureDefinitions}
            isCameraActive={camera.isCameraActive}
            onAddGesture={(gesture) =>
              setGestureDefinitions((current) => [gesture, ...current])
            }
            onDeleteGesture={handleDeleteGesture}
            onSaveSamples={handleSaveGestureSamples}
            onStartCamera={camera.startCamera}
            onStartTraining={handleStartGestureTraining}
            onTestAction={handleTestGestureAction}
            onUpdateGesture={(updatedGesture) =>
              setGestureDefinitions((current) =>
                current.map((gesture) =>
                  gesture.id === updatedGesture.id ? updatedGesture : gesture
                )
              )
            }
            persistenceError={gesturePersistenceError}
            persistenceStatus={gesturePersistenceStatus}
            stream={camera.stream}
          />
        ) : activeView === "Monitor" ? (
          <div className="dashboard-grid">
            <div className="main-column">
              <LiveVisionPanel
                actionExecution={actionExecutionState}
                actionsArmed={areActionsArmed}
                aiServiceStatus={aiServiceStatus}
                errorMessage={camera.errorMessage}
                inferenceEnabled={isInferenceEnabled}
                inferenceError={inferenceError}
                inferenceResult={inferenceResult}
                inferenceStatus={inferenceStatus}
                isCameraActive={camera.isCameraActive}
                onInferenceFrame={handleInferenceFrame}
                onToggleActionsArmed={handleToggleActionsArmed}
                status={camera.status}
                stream={camera.stream}
              />
              <ModelHealth
                aiServiceStatus={aiServiceStatus}
                errorMessage={inferenceError}
                inferenceResult={inferenceResult}
                inferenceStatus={inferenceStatus}
                trainedGestureCount={trainedGestures.length}
              />
              <EventTimeline events={timelineEvents} />
            </div>
            <IdentityPanel />
          </div>
        ) : (
          <SecondaryViews
            activeView={activeView}
            aiServiceUrl={appSettings.aiServiceUrl}
            aiServiceStatus={aiServiceStatus}
            cameraDevices={camera.devices}
            gestures={gestureDefinitions}
            isCameraActive={camera.isCameraActive}
            onSaveSettings={handleSaveSettings}
            persistenceStatus={gesturePersistenceStatus}
            selectedCameraId={camera.selectedDeviceId}
            settingsError={settingsError}
            settingsStatus={settingsStatus}
          />
        )}
      </AppShell>

      {isCalibrating && (
        <CalibrationModal
          isCameraActive={camera.isCameraActive}
          onClose={() => setIsCalibrating(false)}
          onComplete={setCalibrationResult}
          stream={camera.stream}
        />
      )}
    </>
  );
}
