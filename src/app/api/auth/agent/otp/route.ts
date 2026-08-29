import { NextRequest, NextResponse } from "next/server";
import { otpEmail } from "@/lib/email-content";
import {
  getAuthSecret,
  isAgentEmailAllowed,
  noAgentSecretJson,
} from "@/lib/server/auth";
import { DatabaseNotConfiguredError, noDatabaseJson } from "@/lib/server/db";
import { isResendConfigured, sendEmail } from "@/lib/server/mail";
import { issueOtp } from "@/lib/server/otp";
import { listAgentDirectoryEmails } from "@/lib/server/trips";
import { normalizeEmail } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!getAuthSecret()) {
      return NextResponse.json(noAgentSecretJson(), { status: 503 });
    }
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = String(body.email ?? "").trim();
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }

    let directory: string[] = [];
    try {
      directory = await listAgentDirectoryEmails();
    } catch {
      directory = [];
    }
    if (!isAgentEmailAllowed(email, directory)) {
      return NextResponse.json(
        {
          error:
            "This email is not on AGENT_LOGIN_EMAILS. Add it in .env.local (placeholder for Amore agent inboxes).",
        },
        { status: 403 },
      );
    }

    const code = await issueOtp({ purpose: "agent", email: normalizeEmail(email) });
    const copy = otpEmail("agent", code);
    await sendEmail({ to: email, subject: copy.subject, text: copy.text });

    return NextResponse.json({
      ok: true,
      demoCode: isResendConfigured() ? undefined : code,
      message: isResendConfigured()
        ? "Check your email for a sign-in code."
        : "Resend is not configured. Use the demo code shown here.",
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(noDatabaseJson(), { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Unable to send code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
