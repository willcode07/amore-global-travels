import { NextRequest, NextResponse } from "next/server";
import { createId } from "@/lib/ids";
import { canAccessTrip, isAgentAuthorized } from "@/lib/server/auth";
import { DatabaseNotConfiguredError, noDatabaseJson } from "@/lib/server/db";
import {
  isStorageConfigured,
  putObject,
  recordAttachment,
  safeFilename,
} from "@/lib/server/storage";
import { getTripById } from "@/lib/server/trips";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: NextRequest) {
  try {
    if (!isStorageConfigured()) {
      return NextResponse.json(
        {
          error:
            "Object storage is not configured. Paste a flyer URL for now, or set R2_* env vars (see .env.example).",
          code: "NO_STORAGE",
        },
        { status: 503 },
      );
    }
    if (!isAgentAuthorized(request)) {
      return NextResponse.json({ error: "Agent sign-in required to upload." }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const tripId = String(form.get("tripId") ?? "");
    const kind = String(form.get("kind") ?? "flyer");
    const quoteId = String(form.get("quoteId") ?? "") || null;

    if (!(file instanceof File) || !tripId) {
      return NextResponse.json({ error: "file and tripId are required." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is larger than 10MB." }, { status: 400 });
    }
    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED.has(contentType)) {
      return NextResponse.json(
        { error: "Use a PDF or image (JPG, PNG, WebP, GIF)." },
        { status: 400 },
      );
    }

    const trip = await getTripById(tripId);
    if (!trip) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    if (!canAccessTrip(request, trip)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const filename = safeFilename(file.name);
    const key = `uploads/${tripId}/${createId("file")}-${filename}`;
    const body = Buffer.from(await file.arrayBuffer());
    const stored = await putObject({ key, body, contentType });
    const attachment = await recordAttachment({
      tripId,
      quoteId,
      kind,
      objectKey: stored.key,
      filename,
      contentType,
    });

    return NextResponse.json({
      url: stored.url,
      objectKey: stored.key,
      attachmentId: attachment.id,
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(noDatabaseJson(), { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
