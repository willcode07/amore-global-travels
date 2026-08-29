import { NextRequest, NextResponse } from "next/server";
import { canAccessTrip } from "@/lib/server/auth";
import { DatabaseNotConfiguredError, noDatabaseJson } from "@/lib/server/db";
import { findAttachmentByKey, getObject } from "@/lib/server/storage";
import { getTripById } from "@/lib/server/trips";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key") ?? "";
    if (!key) {
      return NextResponse.json({ error: "Missing key." }, { status: 400 });
    }
    const attachment = await findAttachmentByKey(key);
    if (!attachment) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    const trip = await getTripById(attachment.trip_id);
    if (!trip || !canAccessTrip(request, trip)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    const object = await getObject(key);
    if (!object) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    return new NextResponse(object.body, {
      headers: {
        "Content-Type": attachment.content_type || object.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(noDatabaseJson(), { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Unable to read file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
