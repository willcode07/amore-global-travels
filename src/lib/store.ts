import { createId } from "@/lib/ids";
import { assignedAgentIdForPreference, normalizeAssignedAgentId } from "@/lib/agents";
import { persistentSampleRequests } from "@/lib/sample-requests";
import {
  PaymentStatus,
  TravelProposal,
  TravelRequest,
  TripIntake,
  TripType,
} from "@/lib/types";
import { emailsMatch, phonesMatch } from "@/lib/session";

export { createId, createTripRef } from "@/lib/ids";

const STORAGE_KEY = "amore_travel_requests";

const tripTypes: TripType[] = [
  "cruise",
  "all_inclusive",
  "vacation_package",
  "not_sure",
];

const paymentStatuses: PaymentStatus[] = [
  "not_requested",
  "paid",
  "refunded",
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function asTripType(value: unknown): TripType {
  return tripTypes.includes(value as TripType) ? (value as TripType) : "not_sure";
}

function isLegacyInstallmentPlanStatus(value: unknown) {
  return value === "deposit_due" || value === "installment_plan";
}

function asPaymentStatus(value: unknown): PaymentStatus {
  if (isLegacyInstallmentPlanStatus(value)) return "not_requested";
  return paymentStatuses.includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : "not_requested";
}

function asBoolean(value: unknown) {
  return value === true || value === "true";
}

function asIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeIntake(raw: TravelRequest["intake"]): TripIntake | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  return {
    ...raw,
    preferredContactMethods: Array.isArray(raw.preferredContactMethods)
      ? raw.preferredContactMethods.map(String)
      : [],
    transportationModes: Array.isArray(raw.transportationModes)
      ? raw.transportationModes.map(String)
      : [],
    pets: Boolean(raw.pets),
    supportAnimal: Boolean(raw.supportAnimal),
    notes: String(raw.notes ?? ""),
    adultDobs: Array.isArray(raw.adultDobs) ? raw.adultDobs.map(String) : [],
    childDobs: Array.isArray(raw.childDobs) ? raw.childDobs.map(String) : [],
    tripType: asTripType(raw.tripType),
  };
}

function normalizeRequest(raw: TravelRequest): TravelRequest {
  const tripRef = raw.tripRef || raw.accessCode || createId("trip").slice(-8).toUpperCase();
  return {
    ...raw,
    tripRef,
    paymentStatus: asPaymentStatus(raw.paymentStatus),
    installmentPlanActive:
      asBoolean(raw.installmentPlanActive) ||
      isLegacyInstallmentPlanStatus(raw.paymentStatus),
    assignedAgentId: raw.assignedAgentId
      ? normalizeAssignedAgentId(raw.assignedAgentId)
      : assignedAgentIdForPreference(raw.trip?.preferredAgent),
    paymentNote: raw.paymentNote ?? "",
    paidAt: asIsoDate(raw.paidAt),
    refundedAt: asIsoDate(raw.refundedAt),
    quotes: Array.isArray(raw.quotes) ? raw.quotes : [],
    options: Array.isArray(raw.options) ? raw.options : [],
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    clienteaseRef: raw.clienteaseRef ?? null,
    intake: normalizeIntake(raw.intake),
    trip: {
      ...raw.trip,
      tripType: asTripType(raw.trip?.tripType),
      tripStyle: Array.isArray(raw.trip?.tripStyle) ? raw.trip.tripStyle : [],
    },
  };
}

function addPersistentSampleRequests(requests: TravelRequest[]) {
  const existingIds = new Set(requests.map((request) => request.id));
  const missing = persistentSampleRequests().filter(
    (request) => !existingIds.has(request.id),
  );
  return {
    requests: missing.length ? [...requests, ...missing] : requests,
    added: missing.length > 0,
  };
}

export function readRequests(): TravelRequest[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const samples = persistentSampleRequests().map(normalizeRequest);
      writeRequests(samples);
      return samples;
    }
    const parsed = JSON.parse(raw) as { requests?: TravelRequest[] };
    const seeded = addPersistentSampleRequests(parsed.requests ?? []);
    const rawRequests = seeded.requests;
    const requests = rawRequests.map(normalizeRequest);
    const needsNormalization = rawRequests.some(
      (request) =>
        isLegacyInstallmentPlanStatus(request.paymentStatus) ||
        typeof request.installmentPlanActive !== "boolean" ||
        typeof request.assignedAgentId !== "string" ||
        normalizeAssignedAgentId(request.assignedAgentId) !== request.assignedAgentId,
    );
    if (seeded.added || needsNormalization) {
      try {
        writeRequests(requests);
      } catch {
        // Keep the normalized records available if local storage cannot be rewritten.
      }
    }
    return requests;
  } catch {
    return [];
  }
}

export function writeRequests(requests: TravelRequest[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ requests }));
}

export function getRequestById(id: string) {
  return readRequests().find((request) => request.id === id) ?? null;
}

export function findRequestsForTraveler(email: string, phone: string) {
  return readRequests().filter(
    (request) =>
      emailsMatch(request.traveler.email, email) &&
      phonesMatch(request.traveler.phone, phone),
  );
}

export function upsertRequest(request: TravelRequest) {
  const requests = readRequests();
  const normalized = normalizeRequest(request);
  const index = requests.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    requests[index] = normalized;
  } else {
    requests.unshift(normalized);
  }
  writeRequests(requests);
  return normalized;
}

export function cloneQuote(quote: TravelProposal): TravelProposal {
  return {
    ...quote,
    id: createId("quote"),
    createdAt: new Date().toISOString(),
    researchEvidence: quote.researchEvidence?.map((item) => ({ ...item })),
    flightTiers: quote.flightTiers.map((tier) => ({ ...tier, id: createId("tier") })),
    protectionTiers: quote.protectionTiers.map((tier) => ({
      ...tier,
      id: createId("tier"),
    })),
  };
}
