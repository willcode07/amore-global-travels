import { NextRequest, NextResponse } from "next/server";
import { isAgentAuthorized, readAgentSession, readTravelerSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const agent = readAgentSession(request);
  const traveler = readTravelerSession(request);
  if (agent || isAgentAuthorized(request)) {
    return NextResponse.json({
      role: "agent",
      email: agent?.email ?? "",
    });
  }
  if (traveler) {
    return NextResponse.json({
      role: "traveler",
      email: traveler.email,
      phone: traveler.phone,
    });
  }
  return NextResponse.json({ role: null }, { status: 401 });
}
