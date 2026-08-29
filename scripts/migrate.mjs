import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

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

const url = process.env.DATABASE_URL?.trim();
if (!url || url.includes("USER:PASSWORD") || url.includes("@HOST/")) {
  console.error(
    "DATABASE_URL is missing or still a placeholder.\n" +
      "For local Docker: postgresql://amore:amore@localhost:5432/amore\n" +
      "Start Postgres with: docker compose up -d",
  );
  process.exit(1);
}

const migrationsDir = join(root, "db/migrations");
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No .sql files found in db/migrations/");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const body = readFileSync(filePath, "utf8");
    console.log(`Applying ${file}...`);
    await sql.unsafe(body);
  }
  console.log("Migrations complete.");
} finally {
  await sql.end();
}
