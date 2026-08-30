import { execFileSync } from "node:child_process";
import { platform } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const npmCommand = platform() === "win32" ? "npm.cmd" : "npm";
const isDryRun = process.argv.includes("--dry-run");

const terminalCommands = [
  {
    name: "VisionGuard AI Models",
    command: `${npmCommand} run ai:dev`
  },
  {
    name: "VisionGuard Desktop",
    command: `${npmCommand} run desktop:dev`
  }
];

function shellEscape(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function printManualCommands() {
  console.log("Run the services in two separate terminals:");
  console.log("");

  for (const item of terminalCommands) {
    console.log(`${item.name}:`);
    console.log(`  cd ${shellEscape(root)}`);
    console.log(`  ${item.command}`);
    console.log("");
  }
}

if (isDryRun) {
  printManualCommands();
  process.exit(0);
}

if (platform() !== "darwin") {
  printManualCommands();
  process.exit(0);
}

for (const item of terminalCommands) {
  const shellCommand = [
    `cd ${shellEscape(root)}`,
    "clear",
    `printf '\\033]0;${item.name}\\007'`,
    `echo '${item.name}'`,
    item.command
  ].join(" && ");

  execFileSync("osascript", [
    "-e",
    `tell application "Terminal" to do script ${JSON.stringify(shellCommand)}`
  ], {
    stdio: "inherit"
  });
}

console.log("Started VisionGuard AI Models and Desktop in separate Terminal windows.");
console.log("Stop each one independently with Ctrl+C in its own terminal.");
