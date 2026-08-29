import { existsSync, readFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const apiDir = join(root, "src/app/api");
const hiddenDir = join(root, "src/app/_api.static-export");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, ".env"));

const isGithubPages = process.env.GITHUB_PAGES === "true";
const isApiBackend = process.env.NEXT_PUBLIC_DATA_BACKEND === "api";
const hideApi = isGithubPages || !isApiBackend;

let moved = false;

function restore() {
  if (moved && existsSync(hiddenDir) && !existsSync(apiDir)) {
    renameSync(hiddenDir, apiDir);
  }
  moved = false;
}

process.on("exit", restore);
process.on("SIGINT", () => {
  restore();
  process.exit(1);
});
process.on("SIGTERM", () => {
  restore();
  process.exit(1);
});

if (hideApi && existsSync(apiDir)) {
  if (existsSync(hiddenDir)) {
    console.error(
      "src/app/_api.static-export already exists. Move it back to src/app/api and retry.",
    );
    process.exit(1);
  }
  renameSync(apiDir, hiddenDir);
  moved = true;
}

const nextBin = join(root, "node_modules/.bin/next");
const result = spawnSync(nextBin, ["build"], {
  stdio: "inherit",
  cwd: root,
  env: process.env,
});

restore();
process.exit(result.status ?? 1);
