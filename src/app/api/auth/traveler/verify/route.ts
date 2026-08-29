import { NextRequest, NextResponse } from "next/server";
import {
  getAuthSecret,
  noAgentSecretJson,
  setTravelerSessionCookie,
} from "@/lib/server/auth";
import { DatabaseNotConfiguredError, noDatabaseJson } from "@/lib/server/db";
import { consumeOtp } from "@/lib/server/otp";
import { normalizeEmail } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!getAuthSecret()) {
      return NextResponse.json(noAgentSecretJson(), { status: 503 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      phone?: string;
      code?: string;
    };
    const email = normalizeEmail(String(body.email ?? ""));
    const phone = String(body.phone ?? "").trim();
    const code = String(body.code ?? "").trim();
    if (!email || !phone || !code) {
      return NextResponse.json(
        { error: "Email, phone, and code are required." },
        { status: 400 },
      );
    }
    const ok = await consumeOtp({ purpose: "traveler", email, phone, code });
    if (!ok) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    return setTravelerSessionCookie(response, email, phone);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(noDatabaseJson(), { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Unable to verify code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
