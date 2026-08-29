import { createId } from "@/lib/ids";
import {
  PaymentStatus,
  TravelProposal,
  TravelRequest,
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
  "deposit_due",
  "paid",
  "refunded",
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function asTripType(value: unknown): TripType {
  return tripTypes.includes(value as TripType) ? (value as TripType) : "not_sure";
}

function asPaymentStatus(value: unknown): PaymentStatus {
  return paymentStatuses.includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : "not_requested";
}

function normalizeRequest(raw: TravelRequest): TravelRequest {
  const tripRef = raw.tripRef || raw.accessCode || createId("trip").slice(-8).toUpperCase();
  return {
    ...raw,
    tripRef,
    paymentStatus: asPaymentStatus(raw.paymentStatus),
    paymentNote: raw.paymentNote ?? "",
    quotes: Array.isArray(raw.quotes) ? raw.quotes : [],
    options: Array.isArray(raw.options) ? raw.options : [],
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    clienteaseRef: raw.clienteaseRef ?? null,
    trip: {
      ...raw.trip,
      tripType: asTripType(raw.trip?.tripType),
      tripStyle: Array.isArray(raw.trip?.tripStyle) ? raw.trip.tripStyle : [],
    },
  };
}

export function readRequests(): TravelRequest[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { requests?: TravelRequest[] };
    return (parsed.requests ?? []).map(normalizeRequest);
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
    flightTiers: quote.flightTiers.map((tier) => ({ ...tier, id: createId("tier") })),
    protectionTiers: quote.protectionTiers.map((tier) => ({
      ...tier,
      id: createId("tier"),
    })),
  };
}
