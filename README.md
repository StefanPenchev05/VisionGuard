# VisionGuard
A Computer Vision System for Gesture Recognition and Continuous User Authentication

## Run The App

Install Node dependencies from the repository root:

```bash
npm install
```

Install the Python AI service dependencies:

```bash
python3 -m pip install -e "services/ai-models[dev]"
```

Start the AI service and Electron desktop app together:

```bash
npm run dev
```

The AI service runs at `http://127.0.0.1:8765` by default. In the desktop app, open **Settings** to change the AI Service URL used for training and live inference.

## Useful Commands

```bash
npm run ai:dev
npm run desktop:dev
npm run desktop:test
npm run desktop:typecheck
npm run desktop:build
npm run ai:test
```
