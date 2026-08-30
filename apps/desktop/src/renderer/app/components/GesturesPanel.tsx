import {
  AppWindow,
  AlertCircle,
  CheckCircle2,
  Hand,
  Keyboard,
  Mic,
  Minus,
  MousePointerClick,
  Plus,
  Power,
  Trash2,
  RotateCcw,
  Save,
  Search,
  Volume2
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type {
  HandPresenceResult,
  TrainingDataset,
  TrainingEvaluationMetrics,
  TrainingJob
} from "@visionguard/shared-kernel/contracts/ai";
import type { GestureActionType, GestureDefinition, GestureSample } from "../types/gestures";

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

export type HandCaptureStatus = "idle" | "checking" | "detected" | "missing" | "weak" | "error";
export type RecordingLifecycle = "idle" | "counting-down" | "recording" | "complete";

const REQUIRED_SAMPLE_COUNT = 12;
const RECORDING_COUNTDOWN_SECONDS = 3;
const SAMPLE_CAPTURE_INTERVAL_MS = 700;
const MIN_HAND_DETECTION_CONFIDENCE = 0.55;
const MIN_HAND_LANDMARK_COUNT = 18;

type GesturesPanelProps = Readonly<{
  gestures: GestureDefinition[];
  isCameraActive: boolean;
  onAddGesture: (gesture: GestureDefinition) => void;
  onDeleteGesture: (gestureId: string) => Promise<void>;
  onSaveSamples: (
    gestureId: string,
    samples: CapturedGestureSample[]
  ) => Promise<GestureSample[]>;
  onStartCamera: () => void;
  onTestAction: (gesture: GestureDefinition) => Promise<{
    message: string;
    ok: boolean;
  }>;
  onStartTraining: (gesture: GestureDefinition) => Promise<{
    dataset: TrainingDataset;
    gestureIds?: string[];
    job: TrainingJob;
  }>;
  onUpdateGesture: (gesture: GestureDefinition) => void;
  persistenceError: string | null;
  persistenceStatus: "loading" | "ready" | "saving" | "error";
  stream: MediaStream | null;
}>;

const actionOptions = [
  { label: "Open app", value: "open-app", icon: AppWindow, target: "Safari" },
  { label: "Volume down", value: "volume-down", icon: Minus, target: "System volume -10%" },
  { label: "Volume up", value: "volume-up", icon: Volume2, target: "System volume +10%" },
  { label: "Mute audio", value: "mute", icon: Mic, target: "Toggle mute" },
  { label: "Keyboard shortcut", value: "keyboard-shortcut", icon: Keyboard, target: "Cmd+Space" },
  { label: "Mouse click", value: "mouse-click", icon: MousePointerClick, target: "Primary click" }
] satisfies ReadonlyArray<{
  label: string;
  value: GestureActionType;
  icon: typeof AppWindow;
  target: string;
}>;

function buildGestureName(actionType: GestureActionType) {
  if (actionType === "open-app") return "Open Palm";
  if (actionType === "volume-down") return "Swipe Down";
  if (actionType === "volume-up") return "Swipe Up";
  if (actionType === "mute") return "Closed Fist";
  if (actionType === "keyboard-shortcut") return "Two Finger Tap";
  return "Pinch Select";
}

function createGesture(
  id: string,
  name: string,
  actionType: GestureActionType,
  actionTarget: string,
  sampleFiles: GestureSample[]
): GestureDefinition {
  return {
    id,
    actionTarget,
    actionType,
    confidenceTarget: 92,
    createdAt: new Date().toISOString(),
    description: "Recorded from Desk Camera",
    name,
    sampleFiles,
    samples: sampleFiles.length,
    status: sampleFiles.length >= REQUIRED_SAMPLE_COUNT ? "ready" : "draft"
  };
}

function captureVideoSample(video: HTMLVideoElement): CapturedGestureSample | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return {
    capturedAt: new Date().toISOString(),
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    height: canvas.height,
    id: crypto.randomUUID(),
    width: canvas.width
  };
}

export function getGestureCaptureInstruction(params: {
  handCaptureStatus: HandCaptureStatus;
  isCameraActive: boolean;
  isPreviewReady: boolean;
  lifecycle: RecordingLifecycle;
}): { detail: string; title: string } {
  if (!params.isCameraActive) {
    return { detail: "Start camera before recording", title: "Camera required" };
  }

  if (!params.isPreviewReady) {
    return { detail: "Waiting for the camera image", title: "Starting preview" };
  }

  if (params.lifecycle === "counting-down") {
    return { detail: "Place your hand in the circle", title: "Get ready" };
  }

  if (params.lifecycle === "complete") {
    return { detail: "Review samples, then save the gesture", title: "Capture complete" };
  }

  if (params.handCaptureStatus === "checking") {
    return { detail: "Checking hand", title: "Recording gesture" };
  }

  if (params.handCaptureStatus === "missing") {
    return { detail: "Show hand", title: "Recording paused" };
  }

  if (params.handCaptureStatus === "weak") {
    return { detail: "Move hand closer and keep it fully visible", title: "Weak hand sample" };
  }

  if (params.handCaptureStatus === "detected") {
    return { detail: "Hand detected", title: "Recording gesture" };
  }

  if (params.handCaptureStatus === "error") {
    return { detail: "Check camera and AI service", title: "Capture error" };
  }

  return { detail: "Keep hand centered in frame", title: "Ready to record" };
}

export function validateHandSampleQuality(result: HandPresenceResult): {
  message: string | null;
  ok: boolean;
} {
  if (!result.handDetected) {
    return {
      message: result.reason ?? "Show hand to capture samples.",
      ok: false
    };
  }

  if (
    typeof result.confidence === "number" &&
    result.confidence < MIN_HAND_DETECTION_CONFIDENCE
  ) {
    return {
      message: `Hand confidence is ${Math.round(result.confidence * 100)}%. Move hand closer.`,
      ok: false
    };
  }

  if (
    typeof result.landmarkCount === "number" &&
    result.landmarkCount < MIN_HAND_LANDMARK_COUNT
  ) {
    return {
      message: `Only ${result.landmarkCount} hand landmarks detected. Show the full hand.`,
      ok: false
    };
  }

  return { message: null, ok: true };
}

function attachHandMetadata(
  sample: CapturedGestureSample,
  result: HandPresenceResult
): CapturedGestureSample {
  return {
    ...sample,
    handDetected: result.handDetected,
    handDetectionConfidence: result.confidence,
    handLandmarkCount: result.landmarkCount
  };
}

export function formatMetricPercent(value?: number | null): string {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "Not available";
}

function resolveGestureName(gestures: GestureDefinition[], gestureId: string): string {
  return gestures.find((gesture) => gesture.id === gestureId)?.name ?? gestureId;
}

function getTrainingQualityLabel(metrics?: TrainingEvaluationMetrics): string {
  if (!metrics || metrics.sampleCount === 0 || metrics.accuracy === null) {
    return "Waiting for completed training metrics.";
  }

  if (metrics.accuracy >= 0.9) {
    return "Good separation for demo use.";
  }

  if (metrics.accuracy >= 0.75) {
    return "Usable, but record more varied samples.";
  }

  return "Weak separation. Record cleaner samples before demo.";
}

export function getTrainingReadinessMessage(
  gestures: Pick<GestureDefinition, "name" | "sampleFiles">[]
): string | null {
  const trainableGestures = gestures.filter(
    (gesture) => gesture.sampleFiles.length >= REQUIRED_SAMPLE_COUNT
  );

  if (trainableGestures.length >= 2) {
    return null;
  }

  const missingGestureCount = 2 - trainableGestures.length;
  const draftGesture = gestures.find(
    (gesture) => gesture.sampleFiles.length < REQUIRED_SAMPLE_COUNT
  );

  if (draftGesture) {
    const missingSamples = REQUIRED_SAMPLE_COUNT - draftGesture.sampleFiles.length;

    return `${draftGesture.name} needs ${missingSamples} more saved sample${missingSamples === 1 ? "" : "s"}. The model needs 2 gestures with ${REQUIRED_SAMPLE_COUNT} samples each.`;
  }

  return `Record and save ${missingGestureCount} more gesture${missingGestureCount === 1 ? "" : "s"} with ${REQUIRED_SAMPLE_COUNT} samples each before training.`;
}

export function GesturesPanel({
  gestures,
  isCameraActive,
  onAddGesture,
  onDeleteGesture,
  onSaveSamples,
  onStartCamera,
  onTestAction,
  onStartTraining,
  onUpdateGesture,
  persistenceError,
  persistenceStatus,
  stream
}: GesturesPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recordingActiveRef = useRef(false);
  const handValidationInFlightRef = useRef(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [actionType, setActionType] = useState<GestureActionType>("open-app");
  const selectedAction = useMemo(
    () => actionOptions.find((option) => option.value === actionType) ?? actionOptions[0],
    [actionType]
  );
  const [gestureName, setGestureName] = useState(buildGestureName(actionType));
  const [actionTarget, setActionTarget] = useState(selectedAction.target);
  const [capturedSamples, setCapturedSamples] = useState<CapturedGestureSample[]>([]);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [handCaptureStatus, setHandCaptureStatus] = useState<HandCaptureStatus>("idle");
  const [isDeletingGesture, setIsDeletingGesture] = useState(false);
  const [isSavingGesture, setIsSavingGesture] = useState(false);
  const [testingActionGestureId, setTestingActionGestureId] = useState<string | null>(null);
  const [testActionMessage, setTestActionMessage] = useState<string | null>(null);
  const [testActionStatus, setTestActionStatus] = useState<"idle" | "success" | "error">("idle");
  const [trainingGestureId, setTrainingGestureId] = useState<string | null>(null);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [selectedGestureId, setSelectedGestureId] = useState<string | null>(
    gestures[0]?.id ?? null
  );

  const selectedGesture = gestures.find((gesture) => gesture.id === selectedGestureId) ?? gestures[0];
  const recordingLifecycle: RecordingLifecycle =
    countdownRemaining !== null
      ? "counting-down"
      : isRecording
        ? "recording"
        : capturedSamples.length >= REQUIRED_SAMPLE_COUNT
          ? "complete"
          : "idle";
  const captureInstruction = getGestureCaptureInstruction({
    handCaptureStatus,
    isCameraActive,
    isPreviewReady,
    lifecycle: recordingLifecycle
  });
  const normalizedGestureName = gestureName.trim().toLowerCase();
  const isDuplicateGestureName = gestures.some(
    (gesture) => gesture.name.trim().toLowerCase() === normalizedGestureName
  );
  const validationMessage =
    !gestureName.trim()
      ? "Enter a gesture name."
      : isDuplicateGestureName
        ? "A gesture with this name already exists."
        : !actionTarget.trim()
          ? "Enter an action target."
          : capturedSamples.length < REQUIRED_SAMPLE_COUNT
            ? `Capture ${REQUIRED_SAMPLE_COUNT} samples before saving.`
            : null;

  useEffect(() => {
    if (gestures.length === 0) {
      setSelectedGestureId(null);
      return;
    }

    if (!selectedGestureId || !gestures.some((gesture) => gesture.id === selectedGestureId)) {
      setSelectedGestureId(gestures[0].id);
    }
  }, [gestures, selectedGestureId]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
    setIsPreviewReady(false);
  }, [stream]);

  useEffect(() => {
    setGestureName(buildGestureName(actionType));
    setActionTarget(selectedAction.target);
    setTestActionMessage(null);
    setTestActionStatus("idle");
  }, [actionType, selectedAction.target]);

  useEffect(() => {
    if (isCameraActive) {
      return;
    }

    setIsRecording(false);
    setCountdownRemaining(null);
    setHandCaptureStatus("idle");
    setIsPreviewReady(false);
  }, [isCameraActive]);

  useEffect(() => {
    if (countdownRemaining === null) {
      return;
    }

    if (countdownRemaining <= 0) {
      setCountdownRemaining(null);
      setIsRecording(true);
      setHandCaptureStatus("checking");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCountdownRemaining((current) => (
        current === null ? null : Math.max(0, current - 1)
      ));
    }, 1_000);

    return () => window.clearTimeout(timeoutId);
  }, [countdownRemaining]);

  useEffect(() => {
    recordingActiveRef.current = isRecording;

    if (!isRecording) {
      handValidationInFlightRef.current = false;
      return;
    }

    const intervalId = window.setInterval(() => {
      if (handValidationInFlightRef.current) {
        return;
      }

      if (capturedSamples.length >= REQUIRED_SAMPLE_COUNT) {
        window.clearInterval(intervalId);
        setIsRecording(false);
        setHandCaptureStatus("detected");
        return;
      }

      if (!videoRef.current || !isPreviewReady) {
        setCaptureError("Camera preview is not ready yet.");
        setHandCaptureStatus("error");
        return;
      }

      const sample = captureVideoSample(videoRef.current);

      if (!sample) {
        setCaptureError("Could not capture a readable video frame.");
        setHandCaptureStatus("error");
        return;
      }

      if (!window.visionGuard?.inference?.detectHandFrame) {
        setCaptureError("Hand detection is available only in the Electron desktop app.");
        setHandCaptureStatus("error");
        setIsRecording(false);
        return;
      }

      handValidationInFlightRef.current = true;
      setHandCaptureStatus("checking");

      window.visionGuard.inference.detectHandFrame({
        capturedAt: sample.capturedAt,
        dataUrl: sample.dataUrl,
        frameId: sample.id
      }).then((result) => {
        if (!recordingActiveRef.current) {
          return;
        }

        const quality = validateHandSampleQuality(result);

        if (!quality.ok) {
          setCaptureError(quality.message);
          setHandCaptureStatus(result.handDetected ? "weak" : "missing");
          return;
        }

        setCaptureError(null);
        setHandCaptureStatus("detected");
        setCapturedSamples((current) => (
          current.length >= REQUIRED_SAMPLE_COUNT ? current : [...current, attachHandMetadata(sample, result)]
        ));
      }).catch((error: unknown) => {
        if (!recordingActiveRef.current) {
          return;
        }

        setCaptureError(error instanceof Error ? error.message : "Could not detect hand in frame.");
        setHandCaptureStatus("error");
      }).finally(() => {
        handValidationInFlightRef.current = false;
      });
    }, SAMPLE_CAPTURE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [capturedSamples.length, isPreviewReady, isRecording]);

  const handleRecord = () => {
    if (!isCameraActive) {
      onStartCamera();
      return;
    }

    if (!isPreviewReady) {
      setCaptureError("Wait until the camera preview is visible before recording.");
      setHandCaptureStatus("error");
      return;
    }

    if (isRecording || countdownRemaining !== null) {
      setIsRecording(false);
      setCountdownRemaining(null);
      setHandCaptureStatus("idle");
      return;
    }

    if (capturedSamples.length >= REQUIRED_SAMPLE_COUNT) {
      setCaptureError("Reset or save this gesture before recording again.");
      return;
    }

    setCountdownRemaining(RECORDING_COUNTDOWN_SECONDS);
    setCaptureError(null);
    setHandCaptureStatus("idle");
  };

  const handleSaveGesture = async () => {
    if (validationMessage) {
      setCaptureError(validationMessage);
      return;
    }

    setIsRecording(false);
    setIsSavingGesture(true);
    const gestureId = crypto.randomUUID();

    try {
      const sampleFiles = await onSaveSamples(gestureId, capturedSamples);
      const gesture = createGesture(
        gestureId,
        gestureName.trim() || buildGestureName(actionType),
        actionType,
        actionTarget.trim() || selectedAction.target,
        sampleFiles
      );

      onAddGesture(gesture);
      setSelectedGestureId(gesture.id);
      setCapturedSamples([]);
      setCaptureError(null);
      setHandCaptureStatus("idle");
      setTestActionMessage(null);
      setTestActionStatus("idle");
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "Could not save gesture samples.");
    } finally {
      setIsSavingGesture(false);
    }
  };

  const handleSendToTraining = async () => {
    if (!selectedGesture) {
      return;
    }

    const trainableGestures = gestures.filter(
      (gesture) => gesture.sampleFiles.length >= REQUIRED_SAMPLE_COUNT
    );

    if (trainableGestures.length < 2) {
      setTrainingError(getTrainingReadinessMessage(gestures));
      return;
    }

    setTrainingError(null);
    setTrainingGestureId(selectedGesture.id);
    onUpdateGesture({
      ...selectedGesture,
      status: "training",
      training: {
        ...selectedGesture.training,
        errorMessage: undefined,
        updatedAt: new Date().toISOString()
      }
    });

    try {
      const result = await onStartTraining(selectedGesture);
      const status = result.job.status === "completed" ? "trained" : "training";
      const trainingGestureIds = result.gestureIds ?? [selectedGesture.id];

      for (const gesture of gestures) {
        if (!trainingGestureIds.includes(gesture.id)) {
          continue;
        }

        onUpdateGesture({
          ...gesture,
          status,
          training: {
            datasetId: result.dataset.id,
            jobId: result.job.id,
            metrics: result.job.metrics,
            jobProgress: result.job.progress,
            jobStatus: result.job.status,
            queuedAt: result.job.startedAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not start gesture training.";

      setTrainingError(message);
      onUpdateGesture({
        ...selectedGesture,
        status: "training-failed",
        training: {
          ...selectedGesture.training,
          errorMessage: message,
          updatedAt: new Date().toISOString()
        }
      });
    } finally {
      setTrainingGestureId(null);
    }
  };

  const handleDeleteGesture = async (gesture: GestureDefinition = selectedGesture) => {
    if (!gesture) return;

    const shouldDelete = window.confirm(
      `Delete "${gesture.name}" and its saved sample files?`
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeletingGesture(true);
    setTrainingError(null);

    try {
      await onDeleteGesture(gesture.id);
      setSelectedGestureId(null);
    } catch (error) {
      setTrainingError(error instanceof Error ? error.message : "Could not delete gesture.");
    } finally {
      setIsDeletingGesture(false);
    }
  };

  const handleTestAction = async (gesture: GestureDefinition = selectedGesture) => {
    if (!gesture) return;

    setTestingActionGestureId(gesture.id);
    setTestActionMessage(null);
    setTestActionStatus("idle");

    try {
      const result = await onTestAction(gesture);
      setTestActionMessage(result.message);
      setTestActionStatus(result.ok ? "success" : "error");
    } catch (error) {
      setTestActionMessage(error instanceof Error ? error.message : "Could not test gesture action.");
      setTestActionStatus("error");
    } finally {
      setTestingActionGestureId(null);
    }
  };

  const isSelectedGestureTraining = trainingGestureId === selectedGesture?.id;
  const isSelectedGestureTesting = testingActionGestureId === selectedGesture?.id;
  const isTrainingApiAvailable = Boolean(window.visionGuard?.training);
  const trainableGestureCount = gestures.filter(
    (gesture) => gesture.sampleFiles.length >= REQUIRED_SAMPLE_COUNT
  ).length;
  const selectedGestureCanTrain = Boolean(
    selectedGesture && trainableGestureCount >= 2
  );
  const trainingReadinessMessage = getTrainingReadinessMessage(gestures);
  const selectedTrainingProgress = selectedGesture?.training?.jobProgress ?? 0;
  const selectedTrainingStatus = selectedGesture?.training?.jobStatus;
  const selectedTrainingMetrics = selectedGesture?.training?.metrics;
  const selectedValidationMetrics = selectedTrainingMetrics?.validation;
  const selectedModelQualityMetrics =
    selectedValidationMetrics && selectedValidationMetrics.sampleCount > 0
      ? selectedValidationMetrics
      : selectedTrainingMetrics?.training;
  const confusionMatrix = selectedModelQualityMetrics?.confusionMatrix ?? {};
  const confusionLabels = Object.keys(confusionMatrix);
  const detectedSampleCount = capturedSamples.filter((sample) => sample.handDetected).length;
  const confidenceSamples = capturedSamples
    .map((sample) => sample.handDetectionConfidence)
    .filter((confidence): confidence is number => typeof confidence === "number");
  const averageHandConfidence = confidenceSamples.length > 0
    ? confidenceSamples.reduce((sum, confidence) => sum + confidence, 0) / confidenceSamples.length
    : null;
  const landmarkSampleCounts = capturedSamples
    .map((sample) => sample.handLandmarkCount)
    .filter((count): count is number => typeof count === "number");
  const latestLandmarkCount = landmarkSampleCounts.at(-1) ?? null;
  const trainingButtonTitle = !isTrainingApiAvailable
    ? "Training is available in the Electron desktop app."
    : selectedGestureCanTrain
    ? "Train the model with all saved eligible gestures."
    : trainingReadinessMessage ?? `Save at least 2 gestures with ${REQUIRED_SAMPLE_COUNT} samples each before training.`;

  return (
    <div className="gestures-workspace">
      <section className="panel gesture-recorder">
        <div className="section-heading">
          <div>
            <h2>Gesture Recorder</h2>
            <span>Capture repeatable samples for the recognition model.</span>
          </div>
          <strong className={isCameraActive ? "capture-chip active" : "capture-chip"}>
            {isCameraActive ? "Camera ready" : "Camera required"}
          </strong>
        </div>

        <div className="recording-stage">
          <div
            className={`gesture-capture-frame${isRecording ? " is-recording" : ""}${
              countdownRemaining !== null ? " is-counting-down" : ""
            }${
              isCameraActive ? " has-video" : ""
            } hand-status-${handCaptureStatus}`}
          >
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                className="gesture-camera-video"
                muted
                onLoadedMetadata={(event) => {
                  setIsPreviewReady(true);
                  void event.currentTarget.play();
                }}
                onPlaying={() => setIsPreviewReady(true)}
                onWaiting={() => setIsPreviewReady(false)}
                playsInline
              />
            ) : (
              <Hand size={82} />
            )}
            <div className="capture-reticle" />
            <div className="capture-overlay-text">
              <strong>{countdownRemaining !== null ? `Starting in ${countdownRemaining}` : captureInstruction.title}</strong>
              <span>{captureInstruction.detail}</span>
            </div>
          </div>

          <div className="recording-controls">
            <label>
              <span>Gesture name</span>
              <input
                value={gestureName}
                onChange={(event) => setGestureName(event.target.value)}
                placeholder="Open Palm"
              />
            </label>

            <div className="sample-meter">
              <div>
                <span>Samples captured</span>
                <strong>{capturedSamples.length}/{REQUIRED_SAMPLE_COUNT}</strong>
              </div>
              <div className="sample-bars">
                {Array.from({ length: REQUIRED_SAMPLE_COUNT }).map((_, index) => (
                  <i className={index < capturedSamples.length ? "filled" : ""} key={index} />
                ))}
              </div>
              {capturedSamples.length > 0 ? (
                <div className="sample-quality">
                  <span>{detectedSampleCount}/{capturedSamples.length} hand verified</span>
                  <span>
                    {averageHandConfidence === null
                      ? "Confidence pending"
                      : `${Math.round(averageHandConfidence * 100)}% avg confidence`}
                  </span>
                  <span>
                    {latestLandmarkCount === null
                      ? "Landmarks pending"
                      : `${latestLandmarkCount} landmarks`}
                  </span>
                </div>
              ) : null}
              {captureError || (capturedSamples.length > 0 && validationMessage) ? (
                <p className="capture-error">{captureError ?? validationMessage}</p>
              ) : null}
            </div>

            {capturedSamples.length > 0 ? (
              <div className="sample-preview-grid" aria-label="Captured samples">
                {capturedSamples.map((sample, index) => (
                  <figure key={sample.id}>
                    <img alt={`Captured sample ${index + 1}`} src={sample.dataUrl} />
                    <button
                      aria-label={`Delete captured sample ${index + 1}`}
                      disabled={isRecording || countdownRemaining !== null || isSavingGesture}
                      onClick={() =>
                        setCapturedSamples((current) =>
                          current.filter((item) => item.id !== sample.id)
                        )
                      }
                      type="button"
                    >
                      <Trash2 size={12} />
                    </button>
                  </figure>
                ))}
              </div>
            ) : null}

            <div className="recorder-buttons">
              <button className="primary-action" type="button" onClick={handleRecord}>
                <Power size={18} />
                <span>
                  {!isCameraActive
                    ? "Start Camera"
                    : isRecording || countdownRemaining !== null
                      ? "Pause Recording"
                      : "Record Samples"}
                </span>
              </button>
              <button
                className="secondary-action"
                type="button"
                onClick={() => {
                  setIsRecording(false);
                  setCountdownRemaining(null);
                  setCapturedSamples([]);
                  setCaptureError(null);
                  setHandCaptureStatus("idle");
                }}
              >
                <RotateCcw size={18} />
                <span>Reset</span>
              </button>
              <button
                className="secondary-action"
                disabled={
                  Boolean(validationMessage) ||
                  isSavingGesture ||
                  isRecording ||
                  countdownRemaining !== null
                }
                type="button"
                onClick={handleSaveGesture}
              >
                <Save size={18} />
                <span>{isSavingGesture ? "Saving..." : "Save Gesture"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel action-mapper">
        <div className="section-heading">
          <div>
            <h2>Action Mapping</h2>
            <span>Bind a recognized gesture to a desktop action.</span>
          </div>
        </div>

        <div className="action-options">
          {actionOptions.map((option) => {
            const Icon = option.icon;

            return (
              <button
                className={`action-option${actionType === option.value ? " is-selected" : ""}`}
                key={option.value}
                onClick={() => setActionType(option.value)}
                type="button"
              >
                <Icon size={22} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        <label className="action-target">
          <span>Action target</span>
          <input
            value={actionTarget}
            onChange={(event) => setActionTarget(event.target.value)}
            placeholder={selectedAction.target}
          />
        </label>
      </section>

      <section className="panel gesture-library">
        <div className="section-heading">
          <div>
            <h2>Gesture Library</h2>
            <span>Recorded gestures waiting for model training.</span>
          </div>
          <div className="library-meta">
            <div className={`persistence-chip ${persistenceStatus}`}>
              {persistenceStatus === "loading"
                ? "Loading"
                : persistenceStatus === "saving"
                  ? "Saving"
                  : persistenceStatus === "error"
                    ? "Storage error"
                    : "Saved"}
            </div>
            <div className="library-search">
              <Search size={15} />
              <span>{gestures.length} gestures</span>
            </div>
          </div>
        </div>
        {persistenceError ? (
          <p className="persistence-error">{persistenceError}</p>
        ) : null}

        <div className="gesture-library-list">
          {gestures.map((gesture) => (
            <div
              className={`gesture-library-row${selectedGesture?.id === gesture.id ? " is-selected" : ""}`}
              key={gesture.id}
            >
              <button
                className="gesture-library-main"
                onClick={() => setSelectedGestureId(gesture.id)}
                type="button"
              >
                <div className="gesture-row-icon">
                  <Hand size={20} />
                </div>
                <div>
                  <strong>{gesture.name}</strong>
                  <span>
                    {gesture.samples} samples · {gesture.sampleFiles.length} files · {gesture.actionTarget}
                  </span>
                </div>
                <em className={gesture.status}>{gesture.status}</em>
              </button>
              <button
                aria-label={`Delete ${gesture.name}`}
                className="gesture-row-delete"
                disabled={isDeletingGesture || trainingGestureId === gesture.id}
                onClick={() => handleDeleteGesture(gesture)}
                title="Delete this gesture and its saved sample files."
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel training-queue">
        <div className="section-heading">
          <div>
            <h2>Training Queue</h2>
            <span>Prepare labeled data for the gesture recognition model.</span>
          </div>
        </div>

        {selectedGesture ? (
          <div className="training-detail">
            <div className="training-card-header">
              <div>
                <strong>{selectedGesture.name}</strong>
                <span>{selectedGesture.description}</span>
              </div>
              <CheckCircle2 size={22} />
            </div>
            <dl>
              <div>
                <dt>Samples</dt>
                <dd>{selectedGesture.samples}</dd>
              </div>
              <div>
                <dt>Saved files</dt>
                <dd>{selectedGesture.sampleFiles.length}</dd>
              </div>
              <div>
                <dt>Confidence target</dt>
                <dd>{selectedGesture.confidenceTarget}%</dd>
              </div>
              <div>
                <dt>Action</dt>
                <dd>{selectedGesture.actionTarget}</dd>
              </div>
              <div>
                <dt>Trainable gestures</dt>
                <dd>{trainableGestureCount}/2</dd>
              </div>
              <div>
                <dt>Training job</dt>
                <dd>{selectedGesture.training?.jobId ?? "Not started"}</dd>
              </div>
              <div>
                <dt>Progress</dt>
                <dd>
                  {typeof selectedGesture.training?.jobProgress === "number"
                    ? `${Math.round(selectedGesture.training.jobProgress * 100)}%`
                    : "Pending"}
                </dd>
              </div>
              <div>
                <dt>Validation accuracy</dt>
                <dd>{formatMetricPercent(selectedValidationMetrics?.accuracy)}</dd>
              </div>
              <div>
                <dt>Training accuracy</dt>
                <dd>{formatMetricPercent(selectedTrainingMetrics?.training?.accuracy)}</dd>
              </div>
            </dl>
            {trainingError || selectedGesture.training?.errorMessage ? (
              <p className="training-message error">
                <AlertCircle size={15} />
                <span>{trainingError ?? selectedGesture.training?.errorMessage}</span>
              </p>
            ) : selectedGesture.training?.jobId ? (
              <p className="training-message">
                <CheckCircle2 size={15} />
                <span>
                  {selectedTrainingStatus === "completed"
                    ? "Training completed"
                    : selectedTrainingStatus === "running"
                      ? "Training in progress"
                      : "Training queued"}{" "}
                  for dataset {selectedGesture.training.datasetId}.
                </span>
              </p>
            ) : null}
            {trainingReadinessMessage ? (
              <p className="training-message warning">
                <AlertCircle size={15} />
                <span>{trainingReadinessMessage}</span>
              </p>
            ) : null}
            {selectedGesture.training?.jobId ? (
              <div className="training-progress" aria-label="Training progress">
                <span style={{ width: `${Math.round(selectedTrainingProgress * 100)}%` }} />
              </div>
            ) : null}
            {selectedTrainingMetrics ? (
              <div className="training-metrics-panel">
                <div className="training-metrics-summary">
                  <div>
                    <span>Quality</span>
                    <strong>{getTrainingQualityLabel(selectedModelQualityMetrics)}</strong>
                  </div>
                  <div>
                    <span>Validation samples</span>
                    <strong>{selectedValidationMetrics?.sampleCount ?? 0}</strong>
                  </div>
                </div>

                {selectedModelQualityMetrics?.perGestureAccuracy ? (
                  <div className="per-gesture-quality">
                    {Object.entries(selectedModelQualityMetrics.perGestureAccuracy).map(([gestureId, accuracy]) => (
                      <div key={gestureId}>
                        <span>{resolveGestureName(gestures, gestureId)}</span>
                        <strong>{formatMetricPercent(accuracy)}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                {confusionLabels.length > 0 ? (
                  <div className="confusion-matrix" aria-label="Training confusion matrix">
                    <div
                      className="confusion-matrix-grid"
                      style={{
                        gridTemplateColumns: `minmax(86px, 1.2fr) repeat(${confusionLabels.length}, minmax(58px, 1fr))`
                      }}
                    >
                      <span />
                      {confusionLabels.map((labelId) => (
                        <strong key={`predicted-${labelId}`}>
                          {resolveGestureName(gestures, labelId)}
                        </strong>
                      ))}
                      {confusionLabels.map((actualId) => (
                        <Fragment key={`row-${actualId}`}>
                          <strong key={`actual-${actualId}`}>
                            {resolveGestureName(gestures, actualId)}
                          </strong>
                          {confusionLabels.map((predictedId) => (
                            <span
                              className={actualId === predictedId ? "correct" : ""}
                              key={`${actualId}-${predictedId}`}
                            >
                              {confusionMatrix[actualId]?.[predictedId] ?? 0}
                            </span>
                          ))}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {testActionMessage ? (
              <p className={`training-message ${testActionStatus === "error" ? "error" : ""}`}>
                {testActionStatus === "error" ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                <span>{testActionMessage}</span>
              </p>
            ) : null}
            <button
              className="secondary-action"
              disabled={isSelectedGestureTesting || isSelectedGestureTraining || isDeletingGesture}
              onClick={() => handleTestAction()}
              title="Run this gesture's desktop action without waiting for live recognition."
              type="button"
            >
              <Power size={18} />
              <span>{isSelectedGestureTesting ? "Testing..." : "Test Action"}</span>
            </button>
            <button
              className="primary-action"
              disabled={!isTrainingApiAvailable || isSelectedGestureTraining}
              onClick={handleSendToTraining}
              title={trainingButtonTitle}
              type="button"
            >
              <Plus size={18} />
              <span>{isSelectedGestureTraining ? "Training..." : "Train Model"}</span>
            </button>
            <button
              className="secondary-action danger-action"
              disabled={isSelectedGestureTraining || isDeletingGesture}
              onClick={() => handleDeleteGesture()}
              title={
                isSelectedGestureTraining
                  ? "Wait for the training request to finish before deleting."
                  : "Delete this gesture and its saved sample files."
              }
              type="button"
            >
              <Trash2 size={18} />
              <span>{isDeletingGesture ? "Deleting..." : "Delete Gesture"}</span>
            </button>
          </div>
        ) : (
          <p className="empty-state">Record a gesture to create a training item.</p>
        )}
      </section>
    </div>
  );
}
