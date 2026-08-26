import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const aiServicePath = resolve(root, "services/ai-models");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const pythonCommand = process.env.PYTHON ?? "python3";

const processes = [
  spawn(
    pythonCommand,
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
        PYTHONPATH: [
          resolve(aiServicePath, "src"),
          process.env.PYTHONPATH
        ].filter(Boolean).join(":"),
        VISIONGUARD_AI_MODEL_DIR:
          process.env.VISIONGUARD_AI_MODEL_DIR ?? resolve(root, ".visionguard/models")
      },
      stdio: "inherit"
    }
  ),
  spawn(npmCommand, ["run", "desktop:dev"], {
    cwd: root,
    env: process.env,
    stdio: "inherit"
  })
];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  process.exitCode = exitCode;
}

for (const child of processes) {
  child.on("exit", (code) => {
    if (!shuttingDown) {
      shutdown(code ?? 0);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (!existsSync(resolve(aiServicePath, "src"))) {
  console.error("AI service source folder was not found.");
  shutdown(1);
}
