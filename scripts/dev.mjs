import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const aiServicePath = resolve(root, "services/ai-models");

const nodeCommand = process.execPath;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const processes = [
  spawn(
    nodeCommand,
    [
      "scripts/ai.mjs",
      "dev"
    ],
    {
      cwd: root,
      env: process.env,
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
