import { NextRequest, NextResponse } from "next/server";
import { canAccessTrip } from "@/lib/server/auth";
import { DatabaseNotConfiguredError, noDatabaseJson } from "@/lib/server/db";
import { notifyTripEvent } from "@/lib/server/notify";
import { addTripMessage, getTripById } from "@/lib/server/trips";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function handleError(err: unknown) {
  if (err instanceof DatabaseNotConfiguredError) {
    return NextResponse.json(noDatabaseJson(), { status: 503 });
  }
  const message = err instanceof Error ? err.message : "Unexpected error.";
  if (message === "Request not found.") {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (message === "Invalid message.") {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const raw = (await request.json()) as Record<string, unknown>;
    const sender = raw.sender === "agent" ? "agent" : raw.sender === "traveler" ? "traveler" : null;
    if (!sender) {
      return NextResponse.json({ error: "Invalid message." }, { status: 400 });
    }
    const existing = await getTripById(id);
    if (!existing) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    if (!canAccessTrip(request, existing)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    const trip = await addTripMessage(id, {
      sender,
      senderName: typeof raw.senderName === "string" ? raw.senderName : undefined,
      body: String(raw.body ?? ""),
    });
    await notifyTripEvent(
      sender === "traveler" ? "message_from_traveler" : "message_from_agent",
      trip,
      { messagePreview: String(raw.body ?? "").trim() },
    );
    return NextResponse.json({ trip }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
