# VisionGuard

A local desktop computer-vision project for gesture recognition and continuous user authentication.

VisionGuard is split into two parts:

- Electron desktop app: camera UI, gesture recording, training controls, live inference, and desktop actions.
- Python AI service: dataset creation, MediaPipe hand validation, training jobs, model status, and gesture inference.

## Requirements

- Node.js 22 or newer
- npm
- Python 3.11 or newer
- macOS for the current desktop action support

Keyboard shortcut and mouse-click actions may require macOS Accessibility permission for the Electron app.

## Install

From the repository root:

```bash
npm install
npm run ai:setup
```

`npm run ai:setup` creates a local Python virtual environment at `services/ai-models/.venv` and installs the AI service in editable mode with test dependencies.

## Run

Start the AI service and Electron app together:

```bash
npm run dev
```

The AI service runs at:

```text
http://127.0.0.1:8765
```

In the desktop app, open **Settings** to check or change the AI Service URL. The same URL is used for training, training-status polling, and live inference.

You can also run each part separately:

```bash
npm run ai:dev
npm run desktop:dev
```

### Run The AI Service With Docker

If you prefer Docker for the Python AI service, start it with:

```bash
docker compose up --build ai-models
```

The container exposes the same local API URL:

```text
http://127.0.0.1:8765
```

The Electron app still runs on the host:

```bash
npm run desktop:dev
```

Trained model artifacts are persisted in:

```text
.visionguard/models
```

## Demo Flow

### 1. Start The App

Run:

```bash
npm run dev
```

Wait until the Electron window opens. The dashboard should show whether the AI service is online and whether a model is trained.

### 2. Connect The Camera

Click **Start Session** in the top bar.

Expected result:

- The camera preview appears.
- Camera status changes to live.
- The dashboard shows camera resolution and FPS.

If the wrong camera is selected, use the camera dropdown in the top bar.

### 3. Record A Gesture

Open the **Gestures** view.

Use the Gesture Recorder:

1. Choose an action type, for example **Open app** or **Volume down**.
2. Enter a gesture name.
3. Enter the action target, for example `Safari` or `Cmd+Space`.
4. Click **Record Samples**.
5. Keep your hand centered until 12 samples are captured.
6. Review the sample thumbnails.
7. Click **Save Gesture**.

Expected result:

- The gesture appears in the Gesture Library.
- Saved sample files are stored locally by Electron.
- Frames without a detected hand are rejected before they become samples.
- The gesture becomes ready for training.

### 4. Train The Gesture

Select the saved gesture in the Gesture Library.

Click **Send To Training**.

Expected result:

- Electron sends saved sample file references to the AI service.
- The AI service creates a dataset.
- MediaPipe hand landmarks are extracted from each saved sample.
- A training job starts.
- The training panel shows job status and progress.
- When complete, the gesture status changes to `trained`.
- The dashboard model state becomes ready.

If training fails, the UI shows the error message. Common causes are an offline AI service or missing sample files.

### 5. Test Live Inference

Return to the **Monitor** view with the camera running.

Show the trained gesture to the camera.

Expected result:

- The prediction card shows the detected gesture.
- Confidence appears as a percentage.
- Model Health shows latency and ready state.
- The Event Timeline records gesture/action events.
- The mapped desktop action runs after a confident match.

There is a cooldown so one gesture does not repeatedly trigger the same action.

## Desktop Actions

The current Electron app supports:

- Open app
- Volume down
- Volume up
- Mute audio
- Keyboard shortcut
- Mouse click

On macOS, keyboard and mouse actions may require Accessibility permission.

## Useful Commands

```bash
npm run dev
npm run ai:dev
npm run ai:setup
npm run ai:test
npm run desktop:dev
npm run desktop:test
npm run desktop:typecheck
npm run desktop:build
```

## Verification

Run the desktop checks:

```bash
npm run desktop:test
npm run desktop:typecheck
npm run desktop:build
```

Run the AI service tests:

```bash
npm run ai:test
```

The AI commands use `services/ai-models/.venv`. If the venv is missing, run:

```bash
npm run ai:setup
```

## CI

GitHub Actions runs on pushes, pull requests, and manual dispatch. The pipeline installs Node.js and Python, sets up the AI virtual environment, runs desktop tests/typecheck/build, runs AI tests, and builds the AI Docker image.

## Troubleshooting

If the dashboard shows **AI service offline**, make sure the AI service is running:

```bash
npm run ai:dev
```

If the dashboard shows **No trained model**, record a gesture, save it, and send it to training.

If live inference does not start, check that:

- Camera session is active.
- AI service is online.
- At least one gesture is trained.
- The AI Service URL in Settings is correct.

If an app or keyboard action does not execute, check macOS permissions and confirm the action target is valid.
