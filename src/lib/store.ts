import { TravelRequest } from "@/lib/types";

const STORAGE_KEY = "amore_travel_requests";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readRequests(): TravelRequest[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { requests?: TravelRequest[] };
    return parsed.requests ?? [];
  } catch {
    return [];
  }
}

export function writeRequests(requests: TravelRequest[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ requests }));
}

export function getRequestById(id: string) {
  return readRequests().find((r) => r.id === id) ?? null;
}

export function findRequestByPhoneAndCode(phone: string, accessCode: string) {
  const normalizedPhone = phone.replace(/\D/g, "");
  const code = accessCode.trim().toUpperCase();
  return (
    readRequests().find(
      (r) =>
        r.accessCode === code &&
        r.traveler.phone.replace(/\D/g, "") === normalizedPhone,
    ) ?? null
  );
}

export function upsertRequest(request: TravelRequest) {
  const requests = readRequests();
  const index = requests.findIndex((r) => r.id === request.id);
  if (index >= 0) {
    requests[index] = request;
  } else {
    requests.unshift(request);
  }
  writeRequests(requests);
  return request;
}

export function createAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
