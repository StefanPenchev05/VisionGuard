import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const aiServicePath = resolve(root, "services/ai-models");
const venvPath = resolve(aiServicePath, ".venv");
const venvBinPath = resolve(venvPath, process.platform === "win32" ? "Scripts" : "bin");
const venvPythonPath = resolve(
  venvBinPath,
  process.platform === "win32" ? "python.exe" : "python"
);
const systemPython = process.env.PYTHON ?? "python3";
const command = process.argv[2];

function run(executable, args, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    stdio: "inherit"
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exitCode = result.status ?? 0;
  return result.status ?? 0;
}

function ensureVenv() {
  if (!existsSync(venvPythonPath)) {
    console.error("Python virtual environment is missing.");
    console.error("Run: npm run ai:setup");
    process.exit(1);
  }
}

if (command === "setup") {
  if (!existsSync(venvPythonPath)) {
    const status = run(systemPython, ["-m", "venv", ".venv"], {
      cwd: aiServicePath
    });

    if (status !== 0) {
      process.exit(status);
    }
  }

  const upgradeStatus = run(venvPythonPath, ["-m", "pip", "install", "--upgrade", "pip"], {
    cwd: aiServicePath
  });

  if (upgradeStatus !== 0) {
    process.exit(upgradeStatus);
  }

  process.exit(run(venvPythonPath, ["-m", "pip", "install", "-e", ".[dev]"], {
    cwd: aiServicePath
  }));
}

if (command === "dev") {
  ensureVenv();
  process.exit(run(
    venvPythonPath,
    [
      "-m",
      "uvicorn",
      "interfaces.api.app:create_app",
      "--factory",
      "--host",
      "127.0.0.1",
      "--port",
      "8765"
    ],
    {
      cwd: aiServicePath,
      env: {
        ...process.env,
        PATH: [venvBinPath, process.env.PATH].filter(Boolean).join(delimiter),
        PYTHONPATH: [
          resolve(aiServicePath, "src"),
          process.env.PYTHONPATH
        ].filter(Boolean).join(delimiter),
        VISIONGUARD_AI_MODEL_DIR:
          process.env.VISIONGUARD_AI_MODEL_DIR ?? resolve(root, ".visionguard/models")
      }
    }
  ));
}

if (command === "test") {
  ensureVenv();
  process.exit(run(venvPythonPath, ["-m", "pytest", "services/ai-models"], {
    cwd: root
  }));
}

console.error("Usage: node scripts/ai.mjs <setup|dev|test>");
process.exit(1);
