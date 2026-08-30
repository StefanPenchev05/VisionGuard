import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "/Users/stefanpenchev/Documents/Uni/Luxembourg/VisionGuard";
const OUT = `${ROOT}/docs/report/visionguard_presentation.pptx`;
const RENDER_DIR = `${ROOT}/docs/report/presentation-build/rendered`;
let IMAGE_BYTES = {};

const COLORS = {
  bg: "#071014",
  ink: "#F5FAFC",
  muted: "#A7B3BD",
  light: "#101D23",
  rule: "#254854",
  accent: "#25D5E8",
  accentDark: "#67E8F9",
  white: "#071014",
  softBlue: "#0B2F3A",
  panel: "#0E1B21",
};

const frame = { left: 48, top: 44, width: 1184, height: 632 };

async function writeBlob(path, blob) {
  await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer()));
}

function addText(slide, name, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: style.fontSize ?? 24,
    bold: style.bold ?? false,
    color: style.color ?? COLORS.ink,
    alignment: style.alignment ?? "left",
    verticalAlignment: style.verticalAlignment ?? "top",
  };
  return shape;
}

function addTitle(slide, title, kicker = "VISIONGUARD") {
  addText(slide, "kicker", kicker, { left: frame.left, top: 36, width: 420, height: 26 }, {
    fontSize: 17,
    bold: true,
    color: COLORS.accentDark,
  });
  addText(slide, "slide-title", title, { left: frame.left, top: 72, width: 1030, height: 96 }, {
    fontSize: 42,
    bold: true,
  });
}

function addFooter(slide, n) {
  addText(slide, `footer-${n}`, String(n).padStart(2, "0"), {
    left: 1184,
    top: 654,
    width: 48,
    height: 24,
  }, {
    fontSize: 14,
    color: COLORS.muted,
    alignment: "right",
  });
}

function addBodyLines(slide, name, lines, x, y, w, lineGap = 68) {
  lines.forEach((item, index) => {
    addText(slide, `${name}-head-${index}`, item.head, {
      left: x,
      top: y + index * lineGap,
      width: w,
      height: 30,
    }, {
      fontSize: 24,
      bold: true,
    });
    addText(slide, `${name}-body-${index}`, item.body, {
      left: x,
      top: y + index * lineGap + 34,
      width: w,
      height: 38,
    }, {
      fontSize: 17,
      color: COLORS.muted,
    });
  });
}

function addPanel(slide, name, position, fill = COLORS.light) {
  return slide.shapes.add({
    geometry: "roundRect",
    name,
    position,
    fill,
    line: { style: "solid", fill: COLORS.rule, width: 1 },
    borderRadius: 8,
  });
}

function addNotes(slide, sources) {
  slide.speakerNotes.textFrame.setText(`[Sources]\n${sources.map((s) => `- ${s}`).join("\n")}`);
}

function addScreenshot(slide, name, file, position, crop = { left: 0, top: 0, right: 0, bottom: 0 }) {
  slide.images.add({
    blob: IMAGE_BYTES[file],
    contentType: "image/png",
    alt: name,
    fit: "cover",
    crop,
    position,
    geometry: "roundRect",
    borderRadius: 8,
  });
}

function addFlow(slide, items, startX, y, boxW, boxH, gap) {
  const boxes = items.map((item, index) => {
    const box = addPanel(slide, `flow-${index}`, {
      left: startX + index * (boxW + gap),
      top: y,
      width: boxW,
      height: boxH,
    }, index === items.length - 1 ? COLORS.softBlue : COLORS.white);
    addText(slide, `flow-${index}-title`, item.head, {
      left: box.position.left + 18,
      top: box.position.top + 18,
      width: boxW - 36,
      height: 32,
    }, { fontSize: 22, bold: true });
    addText(slide, `flow-${index}-body`, item.body, {
      left: box.position.left + 18,
      top: box.position.top + 58,
      width: boxW - 36,
      height: boxH - 76,
    }, { fontSize: 16, color: COLORS.muted });
    return box;
  });
  for (let i = 0; i < boxes.length - 1; i += 1) {
    slide.shapes.add({
      geometry: "rightArrow",
      name: `flow-arrow-${i}`,
      position: {
        left: boxes[i].position.left + boxW + 7,
        top: y + boxH / 2 - 8,
        width: gap - 14,
        height: 16,
      },
      fill: COLORS.accentDark,
      line: { style: "solid", fill: COLORS.accentDark, width: 0 },
    });
  }
}

async function main() {
  await fs.rm(RENDER_DIR, { recursive: true, force: true });
  await fs.mkdir(RENDER_DIR, { recursive: true });
  IMAGE_BYTES = {
    "visionguard-monitor.png": await fs.readFile(`${ROOT}/docs/report/figures/visionguard-monitor.png`),
    "visionguard-gestures.png": await fs.readFile(`${ROOT}/docs/report/figures/visionguard-gestures.png`),
    "visionguard-models.png": await fs.readFile(`${ROOT}/docs/report/figures/visionguard-models.png`),
  };
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

  function addDarkBase(slide) {
    slide.background.fill = COLORS.bg;
    const base = slide.shapes.add({
      geometry: "rect",
      name: "dark-background",
      position: { left: 0, top: 0, width: 1280, height: 720 },
      fill: COLORS.bg,
      line: { style: "solid", fill: COLORS.bg, width: 0 },
    });
    return base;
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addText(slide, "title", "VisionGuard", { left: 48, top: 62, width: 530, height: 76 }, {
      fontSize: 60,
      bold: true,
    });
    addText(slide, "subtitle", "Gesture recognition and continuous user authentication with local computer vision", {
      left: 48,
      top: 158,
      width: 520,
      height: 112,
    }, {
      fontSize: 28,
      color: COLORS.muted,
    });
    addText(slide, "meta", "Summer Bachelor Semester Project\nUniversity of Luxembourg\nStefan Penchev", {
      left: 48,
      top: 528,
      width: 520,
      height: 90,
    }, {
      fontSize: 19,
      color: COLORS.muted,
    });
    addScreenshot(slide, "VisionGuard live monitor screenshot", "visionguard-monitor.png", {
      left: 650,
      top: 48,
      width: 582,
      height: 624,
    }, { left: 0.02, top: 0, right: 0.0, bottom: 0 });
    addFooter(slide, 1);
    addNotes(slide, [
      "Project report source: docs/report/visionguard_report.tex",
      "Screenshot: docs/report/figures/visionguard-monitor.png",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "Desktop security needs context after login");
    addBodyLines(slide, "problem", [
      { head: "One-time checks are limited", body: "Traditional login verifies a moment, not the full session." },
      { head: "Hands-free control is useful", body: "Repeated desktop actions can be faster through reliable gestures." },
      { head: "Camera input is sensitive", body: "A practical system should process frames locally and expose clear state." },
    ], 62, 226, 500, 96);
    addPanel(slide, "problem-callout", { left: 660, top: 202, width: 520, height: 310 }, COLORS.softBlue);
    addText(slide, "problem-callout-title", "Project question", { left: 704, top: 252, width: 430, height: 48 }, {
      fontSize: 32,
      bold: true,
    });
    addText(slide, "problem-callout-body", "Can a local desktop app connect camera monitoring, gesture training, live inference, and action execution in one understandable workflow?", {
      left: 704,
      top: 326,
      width: 420,
      height: 126,
    }, {
      fontSize: 25,
      color: COLORS.ink,
    });
    addFooter(slide, 2);
    addNotes(slide, [
      "Project report sections: Introduction and Background in docs/report/visionguard_report.tex",
      "Repository README: README.md",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "One loop connects gestures, identity, and actions");
    const objectives = [
      ["Monitor", "Start a camera session and show readiness state."],
      ["Record", "Capture 12 valid hand samples for a gesture."],
      ["Train", "Create a dataset and run a local training job."],
      ["Verify", "Track user presence and identity state."],
      ["Infer", "Predict gestures from live camera frames."],
      ["Act", "Trigger desktop actions after a confident match."],
    ];
    objectives.forEach((row, index) => {
      const y = 174 + index * 70;
      addText(slide, `objective-num-${index}`, `0${index + 1}`, { left: 72, top: y, width: 70, height: 42 }, {
        fontSize: 28,
        bold: true,
        color: COLORS.accentDark,
      });
      addText(slide, `objective-head-${index}`, row[0], { left: 156, top: y, width: 250, height: 34 }, {
        fontSize: 26,
        bold: true,
      });
      addText(slide, `objective-body-${index}`, row[1], { left: 430, top: y + 2, width: 650, height: 34 }, {
        fontSize: 22,
        color: COLORS.muted,
      });
      slide.shapes.add({
        geometry: "line",
        position: { left: 72, top: y + 50, width: 1060, height: 0 },
        fill: "none",
        line: { style: "solid", fill: COLORS.rule, width: 1 },
      });
    });
    addFooter(slide, 3);
    addNotes(slide, [
      "Project objectives summarized from docs/report/visionguard_report.tex",
      "Repository README demo flow: README.md",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "UI, desktop control, and AI stay separate");
    const names = [
      { head: "React renderer", body: "Camera UI, gesture library, model health" },
      { head: "Electron main", body: "IPC, sample files, desktop actions" },
      { head: "Shared kernel", body: "Typed AI service contract" },
      { head: "FastAPI service", body: "Datasets, jobs, hand checks, inference" },
    ];
    addFlow(slide, names, 78, 260, 246, 156, 34);
    addText(slide, "architecture-note", "Camera frames, model calls, and biometric data stay on the local machine through http://127.0.0.1:8765.", {
      left: 146,
      top: 486,
      width: 990,
      height: 42,
    }, {
      fontSize: 24,
      color: COLORS.muted,
      alignment: "center",
    });
    addFooter(slide, 4);
    addNotes(slide, [
      "Desktop app source: apps/desktop/src/renderer/app/App.tsx",
      "Shared contract source: packages/shared-kernel/src/contracts/ai/model-contract.ts",
      "AI service source: services/ai-models/src/interfaces/api/state.py",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "Docker makes the AI service reproducible");
    addPanel(slide, "docker-left", { left: 72, top: 194, width: 492, height: 326 }, COLORS.softBlue);
    addText(slide, "docker-left-title", "Why containers are used", {
      left: 112,
      top: 238,
      width: 400,
      height: 42,
    }, {
      fontSize: 30,
      bold: true,
    });
    addText(slide, "docker-left-body", "The Python AI service depends on computer-vision libraries. Docker reduces setup differences between machines and keeps those dependencies isolated from the host system.", {
      left: 112,
      top: 306,
      width: 390,
      height: 142,
    }, {
      fontSize: 22,
      color: COLORS.ink,
    });
    addBodyLines(slide, "docker-notes", [
      { head: "Stable service setup", body: "OpenCV, MediaPipe, and model dependencies run in a controlled environment." },
      { head: "Cleaner separation", body: "Electron handles desktop and camera permissions; the container handles AI processing." },
      { head: "Future deployment path", body: "Docker Compose can later start the AI service and storage layer together." },
    ], 646, 212, 480, 106);
    addFooter(slide, 5);
    addNotes(slide, [
      "Docker/container content summarized from docs/report/visionguard_report.tex",
      "AI service architecture summarized from docs/report/visionguard_report.tex and packages/shared-kernel/src/contracts/ai/model-contract.ts",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "Samples become confident actions");
    addFlow(slide, [
      { head: "Capture", body: "User shows a hand gesture to the camera." },
      { head: "Validate", body: "Hand presence is checked before saving samples." },
      { head: "Train", body: "Samples become a local gesture model artifact." },
      { head: "Execute", body: "High-confidence matches trigger mapped actions." },
    ], 78, 248, 246, 172, 34);
    addText(slide, "threshold", "Execution threshold: 0.92 confidence with a cooldown to avoid repeated commands.", {
      left: 154,
      top: 500,
      width: 970,
      height: 44,
    }, {
      fontSize: 24,
      color: COLORS.accentDark,
      alignment: "center",
      bold: true,
    });
    addFooter(slide, 6);
    addNotes(slide, [
      "Inference and cooldown logic: apps/desktop/src/renderer/app/App.tsx",
      "Hand presence logic: services/ai-models/src/application/training/gesture_training_worker.py",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "The live monitor makes system state visible");
    addScreenshot(slide, "Live monitor screenshot", "visionguard-monitor.png", {
      left: 70,
      top: 178,
      width: 770,
      height: 440,
    });
    addBodyLines(slide, "monitor-notes", [
      { head: "Readiness", body: "Camera, AI service, trained model, and inference state are visible." },
      { head: "Feedback", body: "Prediction, confidence, model health, and event timeline are shown together." },
      { head: "Control", body: "The user starts sessions, calibrates, exports, and changes views." },
    ], 884, 206, 300, 108);
    addFooter(slide, 7);
    addNotes(slide, [
      "Screenshot: docs/report/figures/visionguard-monitor.png",
      "Live monitor component: apps/desktop/src/renderer/app/components/LiveVisionPanel.tsx",
      "Model health and event timeline rendered from apps/desktop/src/renderer/app/App.tsx",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "Recording, mapping, and training stay connected");
    addScreenshot(slide, "Gesture view screenshot", "visionguard-gestures.png", {
      left: 70,
      top: 178,
      width: 770,
      height: 440,
    });
    addBodyLines(slide, "gesture-notes", [
      { head: "Six action types", body: "Open app, volume down, volume up, mute, shortcut, and mouse click." },
      { head: "Sample rule", body: "A gesture needs 12 captured hand samples before saving." },
      { head: "Training state", body: "Saved gestures move from draft or ready into training and trained states." },
    ], 884, 202, 306, 112);
    addFooter(slide, 8);
    addNotes(slide, [
      "Screenshot: docs/report/figures/visionguard-gestures.png",
      "Gesture component: apps/desktop/src/renderer/app/components/GesturesPanel.tsx",
      "Desktop action support: apps/desktop/src/main/application/actions/execute-gesture-action.ts",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "A small contract drives model operations");
    const rows = [
      ["Dataset", "Create dataset from gesture labels and sample references"],
      ["Training job", "Queue, run, poll, and complete model training"],
      ["Model status", "Report not-trained, loading, ready, degraded, or error"],
      ["Hand presence", "Reject frames that do not contain a detectable hand"],
      ["Inference", "Return predictions, best match, confidence, and latency"],
      ["Authentication", "Return face and presence state for the active session"],
    ];
    rows.forEach((row, i) => {
      const y = 178 + i * 62;
      addPanel(slide, `contract-row-${i}`, { left: 72, top: y, width: 1040, height: 52 }, i % 2 === 0 ? COLORS.light : COLORS.white);
      addText(slide, `contract-head-${i}`, row[0], { left: 96, top: y + 12, width: 210, height: 28 }, {
        fontSize: 22,
        bold: true,
      });
      addText(slide, `contract-body-${i}`, row[1], { left: 330, top: y + 13, width: 740, height: 28 }, {
        fontSize: 20,
        color: COLORS.muted,
      });
    });
    addFooter(slide, 9);
    addNotes(slide, [
      "Shared AI model contract: packages/shared-kernel/src/contracts/ai/model-contract.ts",
      "FastAPI routes: services/ai-models/src/interfaces/api/routes/inference.py",
      "AI service state and training job flow: services/ai-models/src/interfaces/api/state.py",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "The prototype shows a local pipeline");
    const bars = [
      ["App views", 5, "Monitor, Gestures, Identity, Models, Settings"],
      ["Action types", 6, "Application, audio, keyboard, and mouse actions"],
      ["Contract operations", 8, "Dataset, training, model status, hand checks, inference, authentication"],
    ];
    bars.forEach((b, i) => {
      const x = 82 + i * 370;
      addPanel(slide, `result-panel-${i}`, { left: x, top: 218, width: 320, height: 260 }, i === 2 ? COLORS.softBlue : COLORS.panel);
      addText(slide, `result-count-${i}`, String(b[1]), { left: x + 28, top: 254, width: 100, height: 70 }, {
        fontSize: 56,
        bold: true,
        color: COLORS.accentDark,
      });
      addText(slide, `result-head-${i}`, b[0], { left: x + 28, top: 350, width: 260, height: 36 }, {
        fontSize: 26,
        bold: true,
      });
      addText(slide, `result-body-${i}`, b[2], { left: x + 28, top: 404, width: 260, height: 72 }, {
        fontSize: 18,
        color: COLORS.muted,
      });
    });
    addFooter(slide, 10);
    addNotes(slide, [
      "App views: apps/desktop/src/renderer/app/data.ts",
      "Action types: apps/desktop/src/main/application/actions/execute-gesture-action.ts",
      "Contract operations: packages/shared-kernel/src/contracts/ai/model-contract.ts",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "Next steps: identity, models, and containers");
    addBodyLines(slide, "future", [
      { head: "Continuous authentication", body: "Add identity-specific signals beyond gesture recognition." },
      { head: "Temporal gesture model", body: "Use frame sequences for dynamic movements like swipes." },
      { head: "Cross-platform actions", body: "Add Windows and Linux adapters instead of macOS-only commands." },
      { head: "Container setup", body: "Document Docker profiles and service startup for repeatable demos." },
    ], 78, 180, 560, 90);
    addScreenshot(slide, "Models view screenshot", "visionguard-models.png", {
      left: 732,
      top: 184,
      width: 448,
      height: 390,
    });
    addFooter(slide, 11);
    addNotes(slide, [
      "Future work summarized from docs/report/visionguard_report.tex",
      "Screenshot: docs/report/figures/visionguard-models.png",
    ]);
  }

  {
    const slide = presentation.slides.add();
    addDarkBase(slide);
    addTitle(slide, "Evaluation should prove the system is reliable");
    addBodyLines(slide, "eval", [
      { head: "Gesture quality", body: "Measure correct detections, missed gestures, and accidental activations." },
      { head: "Authentication behavior", body: "Test authorized user, absent user, and different-user cases." },
      { head: "Responsiveness", body: "Record frame processing, inference time, action time, and end-to-end latency." },
      { head: "Platform readiness", body: "Check what works on macOS now and what adapters are needed for Windows and Linux." },
    ], 96, 188, 1000, 94);
    addFooter(slide, 12);
    addNotes(slide, [
      "Evaluation method summarized from docs/report/visionguard_report.tex",
    ]);
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(`${RENDER_DIR}/${stem}.png`, await presentation.export({ slide, format: "png", scale: 1 }));
    await fs.writeFile(`${RENDER_DIR}/${stem}.layout.json`, await (await slide.export({ format: "layout" })).text());
  }
  await writeBlob(`${RENDER_DIR}/montage.webp`, await presentation.export({ format: "webp", montage: true, scale: 1 }));

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(OUT);
  console.log(OUT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
