import {
  assignedAgentIdForPreference,
  furthestStatus,
  normalizeAssignedAgentId,
} from "@/lib/agents";
import { createId, createTripRef } from "@/lib/ids";
import { formatTravelWindow, parseAgeList, travelerCountFromIntake, tripPartyCounts } from "@/lib/intake";
import { evaluateQuoteQuality } from "@/lib/quote-quality";
import {
  MessageSender,
  InstallmentPayment,
  MessageAttachment,
  PaymentPlanType,
  PaymentStatus,
  RequestStatus,
  TravelOption,
  TravelProposal,
  TravelRequest,
  TripIntake,
  TripType,
} from "@/lib/types";
import {
  defaultScheduleForPlan,
  isMultiDatePaymentPlan,
  normalizeInstallment,
  normalizePaymentPlanType,
  paymentPlanActive,
} from "@/lib/payments";

export type CreateRequestInput = {
  fullName: string;
  email: string;
  phone: string;
  destination: string;
  departureCity?: string;
  travelWindow: string;
  travelers?: string | number;
  adultsCount?: string | number;
  childrenCount?: string | number;
  adultAges?: Array<string | number>;
  childAges?: Array<string | number>;
  budget?: string;
  preferredAgent?: string;
  preferences?: string;
  tripStyle?: string[];
  tripType?: TripType;
  persistSession?: boolean;
  intake?: TripIntake;
};

export type UpdateRequestBody = {
  status?: RequestStatus;
  paymentStatus?: PaymentStatus;
  installmentPlanActive?: boolean;
  paymentPlanType?: PaymentPlanType;
  paymentSchedule?: InstallmentPayment[];
  assignedAgentId?: string;
  paymentNote?: string;
  paidAt?: string;
  refundedAt?: string;
  intake?: TripIntake;
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
  attachments?: MessageAttachment[];
};

function travelerFirstName(request: TravelRequest) {
  return (
    request.intake?.firstName.trim() ||
    request.traveler.fullName.trim().split(/\s+/)[0] ||
    "there"
  );
}

export function applyCreate(input: CreateRequestInput): TravelRequest {
  const now = new Date().toISOString();
  const fullName = String(input.fullName).trim() || "Demo Traveler";
  const email = String(input.email).trim() || "demo@amoreglobaltravels.com";
  const phone = String(input.phone).trim() || "404-500-7045";
  const destination = String(input.destination).trim() || "Demo destination";
  const travelWindow = String(input.travelWindow).trim() || "Flexible dates";
  const adultAges = parseAgeList(input.adultAges);
  const childAges = parseAgeList(input.childAges);
  const childrenCount = Math.max(0, Number(input.childrenCount) || childAges.length || 0);
  const adultsFromInput = Number(input.adultsCount);
  const adultsCount =
    Number.isInteger(adultsFromInput) && adultsFromInput > 0
      ? adultsFromInput
      : adultAges.length || Math.max(1, (Number(input.travelers) || 1) - childrenCount);
  const travelers = adultsCount + childrenCount || Number(input.travelers) || 1;

  return {
    id: createId("req"),
    tripRef: createTripRef(fullName, phone),
    status: "submitted",
    progressStatus: "submitted",
    paymentStatus: "not_requested",
    installmentPlanActive: false,
    paymentPlanType: "none",
    paymentSchedule: [],
    assignedAgentId: assignedAgentIdForPreference(
      input.intake?.preferredAgent || input.preferredAgent,
    ),
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
      travelers,
      adultsCount,
      childrenCount,
      adultAges,
      childAges,
      budget: String(input.budget ?? "").trim(),
      tripType: input.tripType ?? "not_sure",
      tripStyle: Array.isArray(input.tripStyle) ? input.tripStyle.map(String) : [],
      preferences: String(input.preferences ?? "").trim(),
      preferredAgent: String(input.preferredAgent ?? "").trim(),
    },
    intake: input.intake,
    options: [],
    quotes: [],
    messages: [
      {
        id: createId("msg"),
        sender: "agent",
        senderName: "Amore Global",
        body: "Thanks for requesting a quote. Your agent has received this request and will follow up, usually within 24 hours. You can add extra trip details in your dashboard anytime — nothing else is required before we start researching options.",
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
    if (
      nextStatus === "booking_confirmed" &&
      existing.status !== "booking_confirmed"
    ) {
      updated.messages = [
        ...updated.messages,
        {
          id: createId("msg"),
          sender: "agent",
          senderName: "Amore Global Agent",
          body: `Wonderful news, ${travelerFirstName(updated)}! Your trip has been confirmed. We’ll send your travel details and next steps as they are finalized.`,
          createdAt: updated.updatedAt,
        },
      ];
    }
  }

  if (body.paymentStatus) {
    updated.paymentStatus = body.paymentStatus;
  }
  if (body.paymentPlanType) {
    const nextType = normalizePaymentPlanType(body.paymentPlanType);
    updated.paymentPlanType = nextType;
    updated.installmentPlanActive = paymentPlanActive(nextType);
    if (!isMultiDatePaymentPlan(nextType)) {
      updated.paymentSchedule = [];
    } else if (
      body.paymentSchedule === undefined &&
      (!updated.paymentSchedule || updated.paymentSchedule.length === 0)
    ) {
      updated.paymentSchedule = defaultScheduleForPlan(nextType);
    }
  }
  if (typeof body.installmentPlanActive === "boolean") {
    updated.installmentPlanActive = body.installmentPlanActive;
    if (body.paymentPlanType === undefined) {
      if (body.installmentPlanActive) {
        if (!isMultiDatePaymentPlan(updated.paymentPlanType ?? "none")) {
          updated.paymentPlanType = "installments";
          if (!updated.paymentSchedule?.length) {
            updated.paymentSchedule = defaultScheduleForPlan("installments");
          }
        }
      } else if (isMultiDatePaymentPlan(updated.paymentPlanType ?? "none")) {
        updated.paymentPlanType = "none";
        updated.paymentSchedule = [];
      }
    }
  }
  if (body.paymentSchedule) {
    updated.paymentSchedule = body.paymentSchedule
      .map((item) => normalizeInstallment(item))
      .filter((item): item is InstallmentPayment => Boolean(item));
    if (updated.paymentSchedule.length > 0 && !updated.installmentPlanActive) {
      updated.installmentPlanActive = true;
      if (!isMultiDatePaymentPlan(updated.paymentPlanType ?? "none")) {
        updated.paymentPlanType = "custom";
      }
    }
  }
  if (typeof body.assignedAgentId === "string") {
    updated.assignedAgentId = normalizeAssignedAgentId(body.assignedAgentId);
  }
  if (typeof body.paymentNote === "string") {
    updated.paymentNote = body.paymentNote;
  }
  if (typeof body.paidAt === "string") {
    updated.paidAt = body.paidAt.trim() || undefined;
  }
  if (typeof body.refundedAt === "string") {
    updated.refundedAt = body.refundedAt.trim() || undefined;
  }
  if (body.clienteaseRef !== undefined) {
    updated.clienteaseRef = body.clienteaseRef;
  }

  if (body.intake) {
    const intake = body.intake;
    const travelers = travelerCountFromIntake(intake);
    const fullName =
      [intake.firstName, intake.lastName].filter(Boolean).join(" ").trim();
    const party = tripPartyCounts({
      ...updated.trip,
      adultsCount: Number(intake.adultsCount) || updated.trip.adultsCount,
      childrenCount: Number(intake.childrenCount) || updated.trip.childrenCount,
      travelers,
    });
    updated.intake = intake;
    updated.traveler = {
      fullName: fullName || existing.traveler.fullName,
      email: intake.email.trim() || existing.traveler.email,
      phone: intake.phone.trim() || existing.traveler.phone,
    };
    updated.trip = {
      ...updated.trip,
      destination: intake.destination.trim() || updated.trip.destination,
      travelWindow: formatTravelWindow(
        intake.departureDate,
        intake.returnDate,
        updated.trip.travelWindow,
      ),
      travelers: travelers || updated.trip.travelers,
      adultsCount: party.adultsCount,
      childrenCount: party.childrenCount,
      tripType: intake.tripType || updated.trip.tripType,
      preferredAgent: intake.preferredAgent.trim() || updated.trip.preferredAgent,
      preferences: intake.notes.trim(),
    };
    if (
      !body.assignedAgentId &&
      (!existing.assignedAgentId || existing.assignedAgentId === "shonya")
    ) {
      updated.assignedAgentId = assignedAgentIdForPreference(intake.preferredAgent);
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
  }

  if (body.quote) {
    const quality = evaluateQuoteQuality(body.quote);
    if (!quality.canPublish) {
      throw new Error(
        `Quote cannot be published until ${quality.errors.length} Quality Check issue${
          quality.errors.length === 1 ? "" : "s"
        } ${quality.errors.length === 1 ? "is" : "are"} resolved.`,
      );
    }
    const quote = { ...body.quote, id: body.quote.id || createId("quote") };
    const existingIndex = updated.quotes.findIndex((item) => item.id === quote.id);
    if (existingIndex >= 0) {
      updated.quotes = updated.quotes.map((item) =>
        item.id === quote.id ? quote : item,
      );
    } else {
      updated.quotes = [...updated.quotes, quote];
      updated.messages = [
        ...updated.messages,
        {
          id: createId("msg"),
          sender: "agent",
          senderName: "Amore Global Agent",
          body: `Hi ${travelerFirstName(updated)}! Your quote is ready to review in your dashboard. Please let me know if you have any questions or would like any changes.`,
          createdAt: new Date().toISOString(),
        },
      ];
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
    const selectedOptionId = String(body.selectedOptionId);
    const selectedOption = updated.options.find((option) => option.id === selectedOptionId);
    const selectionChanged = selectedOptionId !== existing.selectedOptionId;
    updated.selectedOptionId = selectedOptionId;
    updated.status = "option_selected";
    updated.progressStatus = furthestStatus(
      "option_selected",
      updated.progressStatus ?? existing.progressStatus ?? existing.status,
    );
    if (selectionChanged) {
      updated.messages = [
        ...updated.messages,
        {
          id: createId("msg"),
          sender: "traveler",
          senderName: updated.traveler.fullName,
          body: `Hi! I selected ${
            selectedOption?.title || "this travel option"
          }. I’m ready to move forward and would love to know the next steps.`,
          createdAt: updated.updatedAt,
        },
      ];
    }
  }

  if (body.selectedQuoteId) {
    const selectedQuoteId = String(body.selectedQuoteId);
    const selectedQuote = updated.quotes.find((quote) => quote.id === selectedQuoteId);
    const selectionChanged = selectedQuoteId !== existing.selectedQuoteId;
    updated.selectedQuoteId = selectedQuoteId;
    updated.status = "option_selected";
    updated.progressStatus = furthestStatus(
      "option_selected",
      updated.progressStatus ?? existing.progressStatus ?? existing.status,
    );
    if (selectionChanged) {
      updated.messages = [
        ...updated.messages,
        {
          id: createId("msg"),
          sender: "traveler",
          senderName: updated.traveler.fullName,
          body: `Hi! I selected ${
            selectedQuote?.occasionTitle || "this quote"
          }. I’m ready to move forward and would love to know the next steps.`,
          createdAt: updated.updatedAt,
        },
      ];
    }
  }

  return updated;
}

export function applyMessage(
  existing: TravelRequest,
  input: AddMessageInput,
): TravelRequest {
  const attachments = (input.attachments ?? []).filter((item) => item?.url);
  const messageBody = String(input.body ?? "").trim();
  const sender = input.sender;
  if ((!messageBody && attachments.length === 0) || (sender !== "traveler" && sender !== "agent")) {
    throw new Error("Invalid message.");
  }

  const message = {
    id: createId("msg"),
    sender,
    senderName:
      String(input.senderName ?? "").trim() ||
      (sender === "traveler" ? existing.traveler.fullName : "Amore Global Agent"),
    body: messageBody || (attachments.length === 1 ? "Shared a file." : "Shared files."),
    createdAt: new Date().toISOString(),
    attachments: attachments.length ? attachments : undefined,
  };

  return {
    ...existing,
    updatedAt: new Date().toISOString(),
    messages: [...existing.messages, message],
  };
}
