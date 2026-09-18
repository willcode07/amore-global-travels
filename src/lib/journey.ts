import type { RequestStatus } from "@/lib/types";

export const journeySteps = [
  {
    title: "Request a Quote",
    text: "Share dates, who is traveling, and the kind of getaway you have in mind.",
  },
  {
    title: "Review your options",
    text: "An agent writes up stay, flights, and protection in your trip dashboard.",
  },
  {
    title: "Confirm your trip",
    text: "Choose the option that feels right, ask questions, then say the word.",
  },
] as const;

export const tripStatusSteps = [
  {
    title: "Quote Requested",
    text: "Your agent has your request and will follow up, usually within 24 hours.",
  },
  {
    title: "Review Options",
    text: "Your quote is ready — choose the option you want.",
  },
  {
    title: "Trip Confirmed",
    text: "Your booking is confirmed. Watch email for vendor details.",
  },
] as const;

const stageByStatus: Record<RequestStatus, number> = {
  submitted: 0,
  under_review: 0,
  options_ready: 1,
  option_selected: 1,
  booking_confirmed: 2,
};

export function journeyStageIndex(status: RequestStatus) {
  return stageByStatus[status] ?? 0;
}

export function journeyStageTitle(status: RequestStatus) {
  return journeySteps[journeyStageIndex(status)].title;
}

export function tripStatusTitle(status: RequestStatus) {
  return tripStatusSteps[journeyStageIndex(status)].title;
}

/** Stored status written when an agent sets a 3-stage inbox step. */
export const agentStageStatuses = [
  "submitted",
  "options_ready",
  "booking_confirmed",
] as const satisfies readonly RequestStatus[];

export function statusForJourneyStage(stage: number): RequestStatus {
  if (stage >= 2) return "booking_confirmed";
  if (stage === 1) return "options_ready";
  return "submitted";
}

export function tripNeedsReview(status: RequestStatus) {
  return journeyStageIndex(status) === 1;
}
