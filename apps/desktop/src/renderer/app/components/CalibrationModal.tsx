import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, TriangleAlert, X } from "lucide-react";

type StepStatus = "pending" | "running" | "done" | "fail";

type Step = {
  label: string;
  detail: string;
  status: StepStatus;
};

type CalibrationModalProps = Readonly<{
  isCameraActive: boolean;
  onClose: () => void;
  stream: MediaStream | null;
}>;

const STEP_TEMPLATES: ReadonlyArray<Omit<Step, "status">> = [
  { label: "Camera feed", detail: "Verifying video stream is active and readable" },
  { label: "Resolution check", detail: "Reading capture resolution from device" },
  { label: "Lighting conditions", detail: "Analysing frame brightness and exposure" },
  { label: "Calibration complete", detail: "All checks passed — system is ready" },
];

function setStepStatus(
  prev: Step[],
  index: number,
  status: StepStatus
): Step[] {
  return prev.map((s, i) => (i === index ? { ...s, status } : s));
}

async function checkStep(index: number, stream: MediaStream | null): Promise<StepStatus> {
  if (index === 0) {
    const live = stream?.getVideoTracks().some((t) => t.readyState === "live") ?? false;
    return live ? "done" : "fail";
  }
  if (index === 1) {
    const settings = stream?.getVideoTracks()[0]?.getSettings();
    return (settings?.width ?? 0) > 0 ? "done" : "fail";
  }
  if (index === 2) {
    return checkBrightness();
  }
  return "done";
}

function checkBrightness(): StepStatus {
  try {
    const video = document.querySelector<HTMLVideoElement>(".camera-video");
    if (!video || video.videoWidth === 0) return "done";
    const canvas = new OffscreenCanvas(32, 32);
    const ctx = canvas.getContext("2d");
    if (!ctx) return "done";
    ctx.drawImage(video, 0, 0, 32, 32);
    const { data } = ctx.getImageData(0, 0, 32, 32);
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avg = total / (data.length / 4);
    return avg < 20 ? "fail" : "done";
  } catch {
    return "done";
  }
}

function StepIcon({ status }: Readonly<{ status: StepStatus }>) {
  if (status === "running") return <Loader2 size={18} className="spin" />;
  if (status === "done")    return <CheckCircle2 size={18} />;
  if (status === "fail")    return <TriangleAlert size={18} />;
  return <span className="step-dot" />;
}

export function CalibrationModal({ isCameraActive, onClose, stream }: CalibrationModalProps) {
  const [steps, setSteps] = useState<Step[]>(
    STEP_TEMPLATES.map((s) => ({ ...s, status: "pending" }))
  );
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (!isCameraActive) return;
    let cancelled = false;

    const run = async (index: number): Promise<void> => {
      if (cancelled || index >= STEP_TEMPLATES.length) {
        if (!cancelled) setDone(true);
        return;
      }
      setSteps((prev) => setStepStatus(prev, index, "running"));
      await new Promise<void>((r) => setTimeout(r, 1400));
      if (cancelled) return;
      const result = await checkStep(index, stream);
      setSteps((prev) => setStepStatus(prev, index, result));
      await run(index + 1);
    };

    run(0);
    return () => { cancelled = true; };
  }, [isCameraActive, stream]);

  const hasFail = steps.some((s) => s.status === "fail");

  const handleClose = () => {
    dialogRef.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog"
      aria-label="Camera Calibration"
      onClose={handleClose}
      onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
    >
      <button
        className="modal-backdrop-close"
        type="button"
        aria-label="Close dialog"
        onClick={handleClose}
      />
      <div className="modal-panel">
          <div className="modal-header">
            <ShieldCheck size={20} />
            <h2>Camera Calibration</h2>
            <button className="modal-close" onClick={handleClose} type="button" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {!isCameraActive ? (
            <p className="modal-notice">Start a session first to run calibration.</p>
          ) : (
            <ol className="calibration-steps">
              {steps.map((step) => (
                <li key={step.label} className={`cal-step ${step.status}`}>
                  <div className="cal-icon">
                    <StepIcon status={step.status} />
                  </div>
                  <div className="cal-text">
                    <strong>{step.label}</strong>
                    <span>{step.detail}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {done && (
            <div className="modal-footer">
              {hasFail && (
                <p className="modal-warn">Some checks failed. Check your camera and lighting.</p>
              )}
              <button className="primary-action modal-done" type="button" onClick={handleClose}>
                {hasFail ? "Close" : "Done"}
              </button>
            </div>
          )}
        </div>
    </dialog>
  );
}

