import { createId } from "@/lib/ids";
import { parseAgeList, tripPartyCounts } from "@/lib/intake";
import { assignedAgentIdForPreference, normalizeAssignedAgentId } from "@/lib/agents";
import {
  derivePaymentPlanType,
  normalizeInstallment,
  paymentPlanActive,
} from "@/lib/payments";
import { persistentSampleRequests } from "@/lib/sample-requests";
import {
  Message,
  MessageAttachment,
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

function asNumberList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return parseAgeList(value as Array<string | number>);
}

function normalizeAttachment(raw: MessageAttachment): MessageAttachment | null {
  if (!raw || typeof raw !== "object") return null;
  const url = String(raw.url ?? "").trim();
  if (!url) return null;
  return {
    id: String(raw.id ?? createId("att")),
    name: String(raw.name ?? "Attachment").trim() || "Attachment",
    url,
    mimeType: String(raw.mimeType ?? "").trim(),
  };
}

function normalizeMessages(raw: TravelRequest["messages"]): Message[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((message) => {
    const attachments = Array.isArray(message.attachments)
      ? message.attachments
          .map((item) => normalizeAttachment(item))
          .filter((item): item is MessageAttachment => Boolean(item))
      : [];
    return {
      ...message,
      attachments: attachments.length ? attachments : undefined,
    };
  });
}

function normalizeTrip(raw: TravelRequest["trip"]): TravelRequest["trip"] {
  const party = tripPartyCounts({
    destination: raw?.destination ?? "",
    departureCity: raw?.departureCity ?? "",
    travelWindow: raw?.travelWindow ?? "",
    travelers: Number(raw?.travelers) || 0,
    adultsCount: Number(raw?.adultsCount) || undefined,
    childrenCount: Number(raw?.childrenCount) || undefined,
    adultAges: asNumberList(raw?.adultAges),
    childAges: asNumberList(raw?.childAges),
    budget: raw?.budget ?? "",
    tripType: asTripType(raw?.tripType),
    tripStyle: Array.isArray(raw?.tripStyle) ? raw.tripStyle : [],
    preferences: raw?.preferences ?? "",
    preferredAgent: raw?.preferredAgent ?? "",
  });
  return {
    ...raw,
    tripType: asTripType(raw?.tripType),
    tripStyle: Array.isArray(raw?.tripStyle) ? raw.tripStyle : [],
    travelers: party.travelers,
    adultsCount: party.adultsCount,
    childrenCount: party.childrenCount,
    adultAges: asNumberList(raw?.adultAges),
    childAges: asNumberList(raw?.childAges),
  };
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
  const installmentPlanActive =
    asBoolean(raw.installmentPlanActive) ||
    isLegacyInstallmentPlanStatus(raw.paymentStatus);
  const paymentPlanType = derivePaymentPlanType({
    paymentPlanType: raw.paymentPlanType,
    installmentPlanActive,
  });
  const paymentSchedule = Array.isArray(raw.paymentSchedule)
    ? raw.paymentSchedule
        .map((item) => normalizeInstallment(item))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  return {
    ...raw,
    tripRef,
    paymentStatus: asPaymentStatus(raw.paymentStatus),
    installmentPlanActive:
      installmentPlanActive || paymentPlanActive(paymentPlanType),
    paymentPlanType,
    paymentSchedule,
    assignedAgentId: raw.assignedAgentId
      ? normalizeAssignedAgentId(raw.assignedAgentId)
      : assignedAgentIdForPreference(raw.trip?.preferredAgent),
    paymentNote: raw.paymentNote ?? "",
    paidAt: asIsoDate(raw.paidAt),
    refundedAt: asIsoDate(raw.refundedAt),
    quotes: Array.isArray(raw.quotes) ? raw.quotes : [],
    options: Array.isArray(raw.options) ? raw.options : [],
    messages: normalizeMessages(raw.messages),
    clienteaseRef: raw.clienteaseRef ?? null,
    intake: normalizeIntake(raw.intake),
    trip: normalizeTrip(raw.trip),
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
        !request.paymentPlanType ||
        !Array.isArray(request.paymentSchedule) ||
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
