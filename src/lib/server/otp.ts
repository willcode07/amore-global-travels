import { createId } from "@/lib/ids";
import { generateOtpCode, hashOtp } from "@/lib/server/auth";
import { requireDb } from "@/lib/server/db";
import { normalizeEmail, normalizePhone } from "@/lib/session";

const OTP_TTL_MS = 10 * 60 * 1000;

export type OtpPurpose = "agent" | "traveler";

export async function issueOtp(input: {
  purpose: OtpPurpose;
  email: string;
  phone?: string;
}) {
  const sql = requireDb();
  const code = generateOtpCode();
  const now = Date.now();
  await sql`
    INSERT INTO login_otps (
      id, purpose, email_normalized, phone_normalized, code_hash, expires_at, created_at
    )
    VALUES (
      ${createId("otp")},
      ${input.purpose},
      ${normalizeEmail(input.email)},
      ${input.phone ? normalizePhone(input.phone) : null},
      ${hashOtp(code)},
      ${new Date(now + OTP_TTL_MS).toISOString()},
      ${new Date(now).toISOString()}
    )
  `;
  return code;
}

export async function consumeOtp(input: {
  purpose: OtpPurpose;
  email: string;
  phone?: string;
  code: string;
}) {
  const sql = requireDb();
  const emailNormalized = normalizeEmail(input.email);
  const phoneNormalized = input.phone ? normalizePhone(input.phone) : "";
  const rows = await sql<{ id: string; phone_normalized: string | null }[]>`
    SELECT id, phone_normalized
    FROM login_otps
    WHERE purpose = ${input.purpose}
      AND email_normalized = ${emailNormalized}
      AND consumed_at IS NULL
      AND expires_at > now()
      AND code_hash = ${hashOtp(String(input.code).trim())}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return false;
  if (input.purpose === "traveler" && phoneNormalized) {
    const stored = row.phone_normalized ?? "";
    if (stored && stored !== phoneNormalized) return false;
  }
  await sql`
    UPDATE login_otps
    SET consumed_at = ${new Date().toISOString()}
    WHERE id = ${row.id}
  `;
  return true;
}
