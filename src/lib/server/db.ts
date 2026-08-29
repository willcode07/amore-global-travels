import postgres from "postgres";

const PLACEHOLDER_MARKERS = ["USER:PASSWORD", "@HOST/", "postgresql://USER:"];

let client: ReturnType<typeof postgres> | null = null;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() ?? "";
}

export function isDatabaseConfigured() {
  const url = getDatabaseUrl();
  if (!url) return false;
  return !PLACEHOLDER_MARKERS.some((marker) => url.includes(marker));
}

export function getDb() {
  if (!isDatabaseConfigured()) return null;
  if (!client) {
    client = postgres(getDatabaseUrl(), { max: 4 });
  }
  return client;
}

export class DatabaseNotConfiguredError extends Error {
  readonly code = "NO_DATABASE" as const;
  constructor() {
    super(
      "Database is not configured. Set DATABASE_URL to a Postgres connection string (see .env.example).",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

export function requireDb() {
  const sql = getDb();
  if (!sql) throw new DatabaseNotConfiguredError();
  return sql;
}

export function noDatabaseJson() {
  return {
    error:
      "Database is not configured. Set DATABASE_URL to a Postgres connection string (see .env.example).",
    code: "NO_DATABASE" as const,
  };
}
