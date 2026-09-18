import { agentNameForId } from "@/lib/agents";
import type { PaymentStatus, RequestStatus, TravelRequest } from "@/lib/types";

export const AGENT_UNLOCK_KEY = "amore_agent_unlocked";
export const AGENT_IDENTITY_KEY = "amore_agent_viewing_as";

export function paymentReadyToConfirm(request: Pick<TravelRequest, "paymentStatus" | "paymentPlanType">) {
  if (request.paymentStatus === "paid") return true;
  const plan = request.paymentPlanType ?? "none";
  return plan !== "none";
}

export function confirmBlockedReason(
  request: Pick<TravelRequest, "paymentStatus" | "paymentPlanType">,
) {
  if (paymentReadyToConfirm(request)) return "";
  return "Mark payment Paid, or save a payment plan, before Trip Confirmed.";
}

export function ownsRequest(request: TravelRequest, agentId: string) {
  return request.assignedAgentId === agentId;
}

export function formatLastUpdated(request: TravelRequest) {
  if (!request.lastUpdatedAt) return "";
  const when = new Date(request.lastUpdatedAt);
  if (Number.isNaN(when.getTime())) return "";
  const who = request.lastUpdatedBy
    ? agentNameForId(request.lastUpdatedBy)
    : "an agent";
  return `Last updated by ${who} · ${when.toLocaleString()}`;
}

export function statusConfirmCopy(status: RequestStatus) {
  if (status === "booking_confirmed") {
    return {
      title: "Mark this trip confirmed?",
      body: "The traveler will see Trip Confirmed and get an automatic notice. This cannot be undone from the queue.",
      confirmLabel: "Confirm trip",
    };
  }
  if (status === "options_ready") {
    return {
      title: "Move to Review Options?",
      body: "Use this when the traveler has a quote to look at.",
      confirmLabel: "Update status",
    };
  }
  return {
    title: "Update trip status?",
    body: "This changes what the traveler sees on their dashboard.",
    confirmLabel: "Update status",
  };
}

export function paymentConfirmCopy(status: PaymentStatus) {
  if (status === "paid") {
    return {
      title: "Mark this trip paid?",
      body: "Use this only after money is actually in. You can add the date and confirmation next.",
      confirmLabel: "Mark paid",
    };
  }
  if (status === "refunded") {
    return {
      title: "Record a refund?",
      body: "This marks the file as refunded for the desk. It does not send money back by itself.",
      confirmLabel: "Record refund",
    };
  }
  return {
    title: "Update payment status?",
    body: "This is desk tracking only.",
    confirmLabel: "Update payment",
  };
}
