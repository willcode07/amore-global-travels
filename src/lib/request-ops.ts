import { furthestStatus } from "@/lib/agents";
import { createId, createTripRef } from "@/lib/ids";
import {
  MessageSender,
  PaymentStatus,
  RequestStatus,
  TravelOption,
  TravelProposal,
  TravelRequest,
  TripType,
} from "@/lib/types";

export type CreateRequestInput = {
  fullName: string;
  email: string;
  phone: string;
  destination: string;
  departureCity?: string;
  travelWindow: string;
  travelers?: string | number;
  budget?: string;
  preferredAgent?: string;
  preferences?: string;
  tripStyle?: string[];
  tripType?: TripType;
  persistSession?: boolean;
};

export type UpdateRequestBody = {
  status?: RequestStatus;
  paymentStatus?: PaymentStatus;
  paymentNote?: string;
  option?: {
    title?: string;
    summary?: string;
    estimatedPrice?: string;
    highlights?: string | string[];
    flyerUrl?: string;
  };
  quote?: TravelProposal;
  selectedOptionId?: string;
  selectedQuoteId?: string;
  silent?: boolean;
  clienteaseRef?: string | null;
};

export type AddMessageInput = {
  sender: MessageSender;
  senderName?: string;
  body: string;
};

export function applyCreate(input: CreateRequestInput): TravelRequest {
  const now = new Date().toISOString();
  const fullName = String(input.fullName).trim() || "Demo Traveler";
  const email = String(input.email).trim() || "demo@amoreglobaltravels.com";
  const phone = String(input.phone).trim() || "404-500-7045";
  const destination = String(input.destination).trim() || "Demo destination";
  const travelWindow = String(input.travelWindow).trim() || "Flexible dates";

  return {
    id: createId("req"),
    tripRef: createTripRef(fullName, phone),
    status: "submitted",
    progressStatus: "submitted",
    paymentStatus: "not_requested",
    paymentNote: "",
    clienteaseRef: null,
    createdAt: now,
    updatedAt: now,
    traveler: {
      fullName,
      email,
      phone,
    },
    trip: {
      destination,
      departureCity: String(input.departureCity ?? "").trim(),
      travelWindow,
      travelers: Number(input.travelers) || 1,
      budget: String(input.budget ?? "").trim(),
      tripType: input.tripType ?? "not_sure",
      tripStyle: Array.isArray(input.tripStyle) ? input.tripStyle.map(String) : [],
      preferences: String(input.preferences ?? "").trim(),
      preferredAgent: String(input.preferredAgent ?? "").trim(),
    },
    options: [],
    quotes: [],
    messages: [
      {
        id: createId("msg"),
        sender: "agent",
        senderName: "Amore Global",
        body: "Thanks for submitting your travel request. An agent will review your details and follow up here with options and a written quote.",
        createdAt: now,
      },
    ],
  };
}

export function applyUpdate(
  existing: TravelRequest,
  body: UpdateRequestBody,
): TravelRequest {
  const updated: TravelRequest = { ...existing, updatedAt: new Date().toISOString() };

  if (body.status) {
    const nextStatus = body.status;
    updated.status = nextStatus;
    updated.progressStatus = furthestStatus(
      nextStatus,
      existing.progressStatus ?? existing.status,
    );
  }

  if (body.paymentStatus) {
    updated.paymentStatus = body.paymentStatus;
  }
  if (typeof body.paymentNote === "string") {
    updated.paymentNote = body.paymentNote;
  }
  if (body.clienteaseRef !== undefined) {
    updated.clienteaseRef = body.clienteaseRef;
  }

  if (body.option) {
    const option: TravelOption = {
      id: createId("opt"),
      title: String(body.option.title ?? "Travel option").trim(),
      summary: String(body.option.summary ?? "").trim(),
      estimatedPrice: String(body.option.estimatedPrice ?? "").trim(),
      highlights: Array.isArray(body.option.highlights)
        ? body.option.highlights.map(String)
        : String(body.option.highlights ?? "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
      flyerUrl: body.option.flyerUrl
        ? String(body.option.flyerUrl).trim()
        : undefined,
      createdAt: new Date().toISOString(),
    };
    updated.options = [...updated.options, option];
    if (updated.status === "submitted" || updated.status === "under_review") {
      updated.status = "options_ready";
    }
    updated.progressStatus = furthestStatus(
      updated.status,
      updated.progressStatus ?? existing.progressStatus ?? existing.status,
    );
  }

  if (body.quote) {
    const quote = { ...body.quote, id: body.quote.id || createId("quote") };
    const existingIndex = updated.quotes.findIndex((item) => item.id === quote.id);
    if (existingIndex >= 0) {
      updated.quotes = updated.quotes.map((item) =>
        item.id === quote.id ? quote : item,
      );
    } else {
      updated.quotes = [...updated.quotes, quote];
    }
    if (updated.status === "submitted" || updated.status === "under_review") {
      updated.status = "options_ready";
    }
    updated.progressStatus = furthestStatus(
      updated.status,
      updated.progressStatus ?? existing.progressStatus ?? existing.status,
    );
  }

  if (body.selectedOptionId) {
    updated.selectedOptionId = String(body.selectedOptionId);
    updated.status = "option_selected";
    updated.progressStatus = furthestStatus(
      "option_selected",
      updated.progressStatus ?? existing.progressStatus ?? existing.status,
    );
  }

  if (body.selectedQuoteId) {
    updated.selectedQuoteId = String(body.selectedQuoteId);
    updated.status = "option_selected";
    updated.progressStatus = furthestStatus(
      "option_selected",
      updated.progressStatus ?? existing.progressStatus ?? existing.status,
    );
  }

  return updated;
}

export function applyMessage(
  existing: TravelRequest,
  input: AddMessageInput,
): TravelRequest {
  const messageBody = String(input.body ?? "").trim();
  const sender = input.sender;
  if (!messageBody || (sender !== "traveler" && sender !== "agent")) {
    throw new Error("Invalid message.");
  }

  const message = {
    id: createId("msg"),
    sender,
    senderName:
      String(input.senderName ?? "").trim() ||
      (sender === "traveler" ? existing.traveler.fullName : "Amore Global Agent"),
    body: messageBody,
    createdAt: new Date().toISOString(),
  };

  return {
    ...existing,
    updatedAt: new Date().toISOString(),
    messages: [...existing.messages, message],
  };
}
