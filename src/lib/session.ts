const SESSION_KEY = "amore_traveler_session";
const LEGACY_ACCESS_KEY = "amore_last_access";

export type TravelerSession = {
  fullName: string;
  email: string;
  phone: string;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function phonesMatch(a: string, b: string) {
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const min = Math.min(left.length, right.length);
  return min >= 7 && (left.endsWith(right) || right.endsWith(left));
}

export function emailsMatch(a: string, b: string) {
  return normalizeEmail(a) === normalizeEmail(b);
}

export function readSession(): TravelerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TravelerSession;
    if (!parsed?.email || !parsed?.phone) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: TravelerSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.localStorage.removeItem(LEGACY_ACCESS_KEY);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(LEGACY_ACCESS_KEY);
}
