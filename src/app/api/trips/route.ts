import { NextRequest, NextResponse } from "next/server";
import {
  getAuthSecret,
  isAgentAuthorized,
  noAgentSecretJson,
} from "@/lib/server/auth";
import { DatabaseNotConfiguredError, noDatabaseJson } from "@/lib/server/db";
import { notifyTripEvent } from "@/lib/server/notify";
import { createTrip, listTripsForAgent, listTripsForTraveler } from "@/lib/server/trips";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function handleError(err: unknown) {
  if (err instanceof DatabaseNotConfiguredError) {
    return NextResponse.json(noDatabaseJson(), { status: 503 });
  }
  const message = err instanceof Error ? err.message : "Unexpected error.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email") ?? "";
    const phone = request.nextUrl.searchParams.get("phone") ?? "";

    if (email || phone) {
      if (!email || !phone) {
        return NextResponse.json(
          { error: "Email and phone are required for traveler lookup." },
          { status: 400 },
        );
      }
      const trips = await listTripsForTraveler(email, phone);
      return NextResponse.json({ trips });
    }

    if (!getAuthSecret()) {
      return NextResponse.json(noAgentSecretJson(), { status: 503 });
    }
    if (!isAgentAuthorized(request)) {
      return NextResponse.json(
        {
          error:
            "Agent authorization required. Send Authorization: Bearer $AGENT_API_SECRET, POST /api/agent/session with the inbox passcode, or POST /api/auth/agent/otp. TEMPORARY until real agent login.",
        },
        { status: 401 },
      );
    }

    const trips = await listTripsForAgent();
    return NextResponse.json({ trips });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const trip = await createTrip({
      fullName: String(body.fullName ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      destination: String(body.destination ?? ""),
      departureCity:
        typeof body.departureCity === "string" ? body.departureCity : undefined,
      travelWindow: String(body.travelWindow ?? ""),
      travelers:
        typeof body.travelers === "string" || typeof body.travelers === "number"
          ? body.travelers
          : undefined,
      budget: typeof body.budget === "string" ? body.budget : undefined,
      preferredAgent:
        typeof body.preferredAgent === "string" ? body.preferredAgent : undefined,
      preferences:
        typeof body.preferences === "string" ? body.preferences : undefined,
      tripStyle: Array.isArray(body.tripStyle)
        ? body.tripStyle.map(String)
        : undefined,
      tripType:
        body.tripType === "cruise" ||
        body.tripType === "all_inclusive" ||
        body.tripType === "vacation_package" ||
        body.tripType === "not_sure"
          ? body.tripType
          : undefined,
    });
    await notifyTripEvent("request_submitted", trip);
    return NextResponse.json({ trip }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
