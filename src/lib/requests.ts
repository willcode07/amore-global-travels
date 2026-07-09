import { furthestStatus } from "@/lib/agents";
import { notifyEvent } from "@/lib/email";
import {
  createAccessCode,
  createId,
  findRequestByPhoneAndCode,
  getRequestById,
  readRequests,
  upsertRequest,
} from "@/lib/store";
import {
  MessageSender,
  RequestStatus,
  TravelOption,
  TravelRequest,
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
};

export function listRequests() {
  return readRequests();
}

export function lookupRequest(phone: string, accessCode: string) {
  const travelRequest = findRequestByPhoneAndCode(phone, accessCode);
  if (!travelRequest) {
    throw new Error("No trip found for that phone number and access code.");
  }
  return travelRequest;
}

export function createRequest(input: CreateRequestInput) {
  const required = [
    input.fullName,
    input.email,
    input.phone,
    input.destination,
    input.travelWindow,
  ];
  if (required.some((value) => !value || String(value).trim() === "")) {
    throw new Error("Please complete all required fields.");
  }

  const now = new Date().toISOString();
  const travelRequest: TravelRequest = {
    id: createId("req"),
    accessCode: createAccessCode(),
    status: "submitted",
    progressStatus: "submitted",
    createdAt: now,
    updatedAt: now,
    traveler: {
      fullName: String(input.fullName).trim(),
      email: String(input.email).trim(),
      phone: String(input.phone).trim(),
    },
    trip: {
      destination: String(input.destination).trim(),
      departureCity: String(input.departureCity ?? "").trim(),
      travelWindow: String(input.travelWindow).trim(),
      travelers: Number(input.travelers) || 1,
      budget: String(input.budget ?? "").trim(),
      tripStyle: Array.isArray(input.tripStyle) ? input.tripStyle.map(String) : [],
      preferences: String(input.preferences ?? "").trim(),
      preferredAgent: String(input.preferredAgent ?? "No preference / first available"),
    },
    options: [],
    messages: [
      {
        id: createId("msg"),
        sender: "agent",
        senderName: "Amore Global",
        body: "Thanks for submitting your travel request. An agent will review your details and follow up here with options.",
        createdAt: now,
      },
    ],
  };

  upsertRequest(travelRequest);
  notifyEvent("request_submitted", travelRequest);
  return travelRequest;
}

export function updateRequest(
  id: string,
  body: {
    status?: RequestStatus;
    option?: {
      title?: string;
      summary?: string;
      estimatedPrice?: string;
      highlights?: string | string[];
      flyerUrl?: string;
    };
    selectedOptionId?: string;
    silent?: boolean;
  },
) {
  const existing = getRequestById(id);
  if (!existing) {
    throw new Error("Request not found.");
  }

  const updated = { ...existing, updatedAt: new Date().toISOString() };
  const silent = Boolean(body.silent);

  if (body.status) {
    const nextStatus = body.status;
    updated.status = nextStatus;
    updated.progressStatus = furthestStatus(
      nextStatus,
      existing.progressStatus ?? existing.status,
    );
    if (!silent) {
      const event =
        updated.status === "options_ready" ? "options_ready" : "status_updated";
      notifyEvent(event, updated);
    }
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
    if (!silent) {
      notifyEvent("options_ready", updated);
    }
  }

  if (body.selectedOptionId) {
    updated.selectedOptionId = String(body.selectedOptionId);
    updated.status = "option_selected";
    updated.progressStatus = furthestStatus(
      "option_selected",
      updated.progressStatus ?? existing.progressStatus ?? existing.status,
    );
    if (!silent) {
      notifyEvent("option_selected", updated);
      notifyEvent("status_updated", updated);
    }
  }

  return upsertRequest(updated);
}

export function addMessage(
  id: string,
  input: { sender: MessageSender; senderName?: string; body: string },
) {
  const existing = getRequestById(id);
  if (!existing) {
    throw new Error("Request not found.");
  }

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

  const updated = {
    ...existing,
    updatedAt: new Date().toISOString(),
    messages: [...existing.messages, message],
  };

  upsertRequest(updated);
  notifyEvent(
    sender === "traveler" ? "message_from_traveler" : "message_from_agent",
    updated,
    { messagePreview: messageBody },
  );

  return updated;
}
