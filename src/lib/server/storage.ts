import { AwsClient } from "aws4fetch";
import { createId } from "@/lib/ids";
import { requireDb } from "@/lib/server/db";

export function isStorageConfigured() {
  return Boolean(
    process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_ENDPOINT?.trim() &&
      process.env.R2_BUCKET?.trim(),
  );
}

function r2Client() {
  if (!isStorageConfigured()) return null;
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    service: "s3",
    region: "auto",
  });
}

function objectUrl(key: string) {
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (publicBase) return `${publicBase}/${key}`;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/api/files?key=${encodeURIComponent(key)}`;
}

export async function putObject(input: {
  key: string;
  body: Buffer | Uint8Array | ArrayBuffer;
  contentType: string;
}) {
  const client = r2Client();
  const endpoint = process.env.R2_ENDPOINT?.trim().replace(/\/$/, "");
  const bucket = process.env.R2_BUCKET?.trim();
  if (!client || !endpoint || !bucket) {
    throw new Error("Object storage is not configured.");
  }
  const url = `${endpoint}/${bucket}/${input.key}`;
  const res = await client.fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": input.contentType,
    },
    body: input.body as BodyInit,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return { key: input.key, url: objectUrl(input.key) };
}

export async function getObject(key: string) {
  const client = r2Client();
  const endpoint = process.env.R2_ENDPOINT?.trim().replace(/\/$/, "");
  const bucket = process.env.R2_BUCKET?.trim();
  if (!client || !endpoint || !bucket) return null;
  const res = await client.fetch(`${endpoint}/${bucket}/${key}`);
  if (!res.ok) return null;
  return res;
}

export async function recordAttachment(input: {
  tripId: string;
  quoteId?: string | null;
  kind: string;
  objectKey: string;
  filename: string;
  contentType: string;
}) {
  const sql = requireDb();
  const id = createId("att");
  await sql`
    INSERT INTO attachments (
      id, trip_id, quote_id, kind, object_key, filename, content_type, created_at
    )
    VALUES (
      ${id},
      ${input.tripId},
      ${input.quoteId ?? null},
      ${input.kind},
      ${input.objectKey},
      ${input.filename},
      ${input.contentType},
      ${new Date().toISOString()}
    )
  `;
  return { id, url: objectUrl(input.objectKey), objectKey: input.objectKey };
}

export async function findAttachmentByKey(key: string) {
  const sql = requireDb();
  const rows = await sql<{ trip_id: string; object_key: string; content_type: string | null }[]>`
    SELECT trip_id, object_key, content_type
    FROM attachments
    WHERE object_key = ${key}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "file";
}
