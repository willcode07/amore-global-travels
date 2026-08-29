import type { RequestStatus } from "@/lib/types";

export const journeySteps = [
  {
    title: "Request a Quote",
    text: "Share dates, travelers, and the kind of getaway you have in mind.",
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
