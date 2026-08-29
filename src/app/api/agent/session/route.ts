import { NextRequest, NextResponse } from "next/server";
import {
  AGENT_COOKIE,
  agentSessionToken,
  expectedAgentPasscode,
  getAgentApiSecret,
  noAgentSecretJson,
} from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * TEMPORARY browser helper: the public agent passcode is exchanged for an
 * httpOnly cookie signed with AGENT_API_SECRET so the agent inbox can call
 * GET /api/trips without embedding the server secret in the client bundle.
 * Replace with Google Workspace / magic-link login.
 */
export async function POST(request: NextRequest) {
  const secret = getAgentApiSecret();
  if (!secret) {
    return NextResponse.json(noAgentSecretJson(), { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { passcode?: string };
  if (String(body.passcode ?? "").trim() !== expectedAgentPasscode()) {
    return NextResponse.json({ error: "Incorrect agent passcode." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AGENT_COOKIE, agentSessionToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
