import {
  AppWindow,
  CheckCircle2,
  Hand,
  Keyboard,
  Mic,
  Minus,
  MousePointerClick,
  Plus,
  Power,
  RotateCcw,
  Save,
  Search,
  Volume2
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GestureActionType, GestureDefinition } from "../types/gestures";

type GesturesPanelProps = Readonly<{
  gestures: GestureDefinition[];
  isCameraActive: boolean;
  onAddGesture: (gesture: GestureDefinition) => void;
  onStartCamera: () => void;
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
  name: string,
  actionType: GestureActionType,
  actionTarget: string,
  samples: number
): GestureDefinition {
  return {
    id: crypto.randomUUID(),
    actionTarget,
    actionType,
    confidenceTarget: 92,
    createdAt: new Date().toISOString(),
    description: "Recorded from Desk Camera",
    name,
    samples,
    status: samples >= 12 ? "ready" : "draft"
  };
}

export function GesturesPanel({
  gestures,
  isCameraActive,
  onAddGesture,
  onStartCamera,
  onUpdateGesture,
  persistenceError,
  persistenceStatus,
  stream
}: GesturesPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [actionType, setActionType] = useState<GestureActionType>("open-app");
  const selectedAction = useMemo(
    () => actionOptions.find((option) => option.value === actionType) ?? actionOptions[0],
    [actionType]
  );
  const [gestureName, setGestureName] = useState(buildGestureName(actionType));
  const [actionTarget, setActionTarget] = useState(selectedAction.target);
  const [sampleCount, setSampleCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedGestureId, setSelectedGestureId] = useState<string | null>(
    gestures[0]?.id ?? null
  );

  const selectedGesture = gestures.find((gesture) => gesture.id === selectedGestureId) ?? gestures[0];

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    setGestureName(buildGestureName(actionType));
    setActionTarget(selectedAction.target);
  }, [actionType, selectedAction.target]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSampleCount((current) => {
        if (current >= 12) {
          window.clearInterval(intervalId);
          setIsRecording(false);
          return current;
        }

        return current + 1;
      });
    }, 260);

    return () => window.clearInterval(intervalId);
  }, [isRecording]);

  const handleRecord = () => {
    if (!isCameraActive) {
      onStartCamera();
      return;
    }

    setIsRecording((current) => !current);
  };

  const handleSaveGesture = () => {
    setIsRecording(false);
    const gesture = createGesture(
      gestureName.trim() || buildGestureName(actionType),
      actionType,
      actionTarget.trim() || selectedAction.target,
      sampleCount
    );
    onAddGesture(gesture);
    setSelectedGestureId(gesture.id);
    setSampleCount(0);
  };

  const handleSendToTraining = () => {
    if (!selectedGesture) {
      return;
    }

    onUpdateGesture({ ...selectedGesture, status: "training" });
  };

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
              isCameraActive ? " has-video" : ""
            }`}
          >
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                className="gesture-camera-video"
                muted
                playsInline
              />
            ) : (
              <Hand size={82} />
            )}
            <div className="capture-reticle" />
            <div className="capture-overlay-text">
              <strong>{isRecording ? "Recording gesture" : "Ready to record"}</strong>
              <span>{isCameraActive ? "Keep hand centered in frame" : "Start camera before recording"}</span>
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
                <strong>{sampleCount}/12</strong>
              </div>
              <div className="sample-bars">
                {Array.from({ length: 12 }).map((_, index) => (
                  <i className={index < sampleCount ? "filled" : ""} key={index} />
                ))}
              </div>
            </div>

            <div className="recorder-buttons">
              <button className="primary-action" type="button" onClick={handleRecord}>
                <Power size={18} />
                <span>
                  {!isCameraActive
                    ? "Start Camera"
                    : isRecording
                      ? "Pause Recording"
                      : "Record Samples"}
                </span>
              </button>
              <button
                className="secondary-action"
                type="button"
                onClick={() => {
                  setIsRecording(false);
                  setSampleCount(0);
                }}
              >
                <RotateCcw size={18} />
                <span>Reset</span>
              </button>
              <button
                className="secondary-action"
                disabled={sampleCount === 0}
                type="button"
                onClick={handleSaveGesture}
              >
                <Save size={18} />
                <span>Save Gesture</span>
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
            <button
              className={`gesture-library-row${selectedGesture?.id === gesture.id ? " is-selected" : ""}`}
              key={gesture.id}
              onClick={() => setSelectedGestureId(gesture.id)}
              type="button"
            >
              <div className="gesture-row-icon">
                <Hand size={20} />
              </div>
              <div>
                <strong>{gesture.name}</strong>
                <span>
                  {gesture.samples} samples · {gesture.actionTarget}
                </span>
              </div>
              <em className={gesture.status}>{gesture.status}</em>
            </button>
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
                <dt>Confidence target</dt>
                <dd>{selectedGesture.confidenceTarget}%</dd>
              </div>
              <div>
                <dt>Action</dt>
                <dd>{selectedGesture.actionTarget}</dd>
              </div>
            </dl>
            <button
              className="primary-action"
              disabled={selectedGesture.samples < 6}
              onClick={handleSendToTraining}
              type="button"
            >
              <Plus size={18} />
              <span>Send To Training</span>
            </button>
          </div>
        ) : (
          <p className="empty-state">Record a gesture to create a training item.</p>
        )}
      </section>
    </div>
  );
}
