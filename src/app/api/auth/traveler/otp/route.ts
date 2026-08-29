import { NextRequest, NextResponse } from "next/server";
import { otpEmail } from "@/lib/email-content";
import { getAuthSecret, noAgentSecretJson } from "@/lib/server/auth";
import { DatabaseNotConfiguredError, noDatabaseJson } from "@/lib/server/db";
import { isResendConfigured, sendEmail } from "@/lib/server/mail";
import { issueOtp } from "@/lib/server/otp";
import { listTripsForTraveler } from "@/lib/server/trips";
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
    };
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    if (!email.includes("@") || !phone) {
      return NextResponse.json(
        { error: "Email and phone are required." },
        { status: 400 },
      );
    }

    const trips = await listTripsForTraveler(email, phone);
    if (trips.length === 0) {
      return NextResponse.json(
        { error: "No trips found for that email and phone number." },
        { status: 404 },
      );
    }

    const code = await issueOtp({
      purpose: "traveler",
      email: normalizeEmail(email),
      phone,
    });
    const copy = otpEmail("traveler", code);
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
