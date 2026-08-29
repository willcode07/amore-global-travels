import { createHmac, createHash, randomInt, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { emailsMatch, normalizeEmail, phonesMatch } from "@/lib/session";
import { TravelRequest } from "@/lib/types";

export const AGENT_COOKIE = "amore_agent_api";
export const AGENT_SESSION_COOKIE = "amore_agent_session";
export const TRAVELER_SESSION_COOKIE = "amore_traveler_session";

export type AgentSessionPayload = {
  role: "agent";
  email: string;
  exp: number;
};

export type TravelerSessionPayload = {
  role: "traveler";
  email: string;
  phone: string;
  exp: number;
};

const WEEK_SECONDS = 60 * 60 * 24 * 7;

export function getAgentApiSecret() {
  return process.env.AGENT_API_SECRET?.trim() ?? "";
}

export function getAuthSecret() {
  return process.env.AUTH_SECRET?.trim() || getAgentApiSecret();
}

export function isAgentSecretConfigured() {
  return Boolean(getAuthSecret());
}

export function expectedAgentPasscode() {
  return process.env.NEXT_PUBLIC_AGENT_PASSCODE || "amore-agents";
}

export function agentLoginAllowlist() {
  return (process.env.AGENT_LOGIN_EMAILS ?? "")
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

export function isAgentEmailAllowed(email: string, directoryEmails: string[] = []) {
  const needle = normalizeEmail(email);
  if (!needle) return false;
  const allow = agentLoginAllowlist();
  if (allow.includes(needle)) return true;
  if (directoryEmails.map(normalizeEmail).includes(needle)) return true;
  // Placeholder mode: empty allowlist lets the developer sign in with their own inbox.
  return allow.length === 0;
}

export function agentSessionToken(secret: string) {
  return createHmac("sha256", secret).update("amore-agent-session-v1").digest("hex");
}

function secretsEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function signPayload(payload: object) {
  const secret = getAuthSecret();
  if (!secret) return "";
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readSigned<T>(token: string): T | null {
  const secret = getAuthSecret();
  if (!secret || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (!secretsEqual(sig, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & {
      exp?: number;
    };
    if (parsed.exp && parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: WEEK_SECONDS,
  };
}

export function hashOtp(code: string) {
  const secret = getAuthSecret() || "amore-demo-otp";
  return createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function isAgentAuthorized(request: NextRequest) {
  const secret = getAuthSecret();
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (bearer && secretsEqual(bearer, getAgentApiSecret() || secret)) return true;

  const legacy = request.cookies.get(AGENT_COOKIE)?.value ?? "";
  if (legacy && secretsEqual(legacy, agentSessionToken(secret))) return true;

  const session = readAgentSession(request);
  return Boolean(session);
}

export function readAgentSession(request: NextRequest): AgentSessionPayload | null {
  const raw = request.cookies.get(AGENT_SESSION_COOKIE)?.value ?? "";
  if (!raw) return null;
  const parsed = readSigned<AgentSessionPayload>(raw);
  return parsed?.role === "agent" ? parsed : null;
}

export function readTravelerSession(request: NextRequest): TravelerSessionPayload | null {
  const raw = request.cookies.get(TRAVELER_SESSION_COOKIE)?.value ?? "";
  if (!raw) return null;
  const parsed = readSigned<TravelerSessionPayload>(raw);
  return parsed?.role === "traveler" ? parsed : null;
}

export function setAgentSessionCookie(response: NextResponse, email: string) {
  const secret = getAuthSecret();
  const token = signPayload({
    role: "agent",
    email: normalizeEmail(email),
    exp: Date.now() + WEEK_SECONDS * 1000,
  } satisfies AgentSessionPayload);
  response.cookies.set(AGENT_SESSION_COOKIE, token, cookieOptions());
  if (secret) {
    response.cookies.set(AGENT_COOKIE, agentSessionToken(secret), cookieOptions());
  }
  return response;
}

export function setTravelerSessionCookie(
  response: NextResponse,
  email: string,
  phone: string,
) {
  const token = signPayload({
    role: "traveler",
    email: normalizeEmail(email),
    phone,
    exp: Date.now() + WEEK_SECONDS * 1000,
  } satisfies TravelerSessionPayload);
  response.cookies.set(TRAVELER_SESSION_COOKIE, token, cookieOptions());
  return response;
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(AGENT_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(AGENT_SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(TRAVELER_SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}

export function travelerOwnsTrip(session: TravelerSessionPayload, trip: TravelRequest) {
  return (
    emailsMatch(session.email, trip.traveler.email) &&
    phonesMatch(session.phone, trip.traveler.phone)
  );
}

export function canAccessTrip(request: NextRequest, trip: TravelRequest) {
  if (isAgentAuthorized(request)) return true;
  const traveler = readTravelerSession(request);
  return Boolean(traveler && travelerOwnsTrip(traveler, trip));
}

export function noAgentSecretJson() {
  return {
    error:
      "AUTH_SECRET or AGENT_API_SECRET is not configured. Set a server-only secret (see .env.example).",
    code: "NO_AGENT_SECRET" as const,
  };
}
