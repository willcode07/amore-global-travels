import type { RequestStatus } from "@/lib/types";

/** Blank first, then named agents per client meeting notes. */
export const agents = [
  { id: "blank", name: "" },
  { id: "valerie", name: "Valerie Takpor" },
  { id: "jaleeza", name: "Jaleeza Smith-Breedlove" },
  { id: "alfreda", name: "Alfreda Gibson" },
  { id: "stephanie", name: "Stephanie Burney" },
  { id: "shonya", name: "Shonya Morrison" },
] as const;

export const contactMethodOptions = [
  "Email",
  "Phone Call",
  "Text",
] as const;

export const transportationOptions = [
  "Cruise",
  "Drive Private Vehicle",
  "Flight",
  "Rental Car",
  "Train",
] as const;

export const tripStyleOptions = [
  "Hotel / resort",
  "Cruise",
  "All-inclusive",
  "City / populated area",
  "Quiet / private",
  "Family-friendly",
  "Adventure / excursions",
  "Romantic getaway",
] as const;

export const budgetOptions = [
  "Under $1,500 per person",
  "$1,500 – $3,000 per person",
  "$3,000 – $5,000 per person",
  "$5,000+ per person",
  "Flexible / not sure yet",
] as const;

export const statusLabels: Record<string, string> = {
  submitted: "Request submitted",
  under_review: "Under review",
  options_ready: "Travel options ready",
  option_selected: "Option selected",
  booking_confirmed: "Booking confirmed",
};

export const statusOrder = [
  "submitted",
  "under_review",
  "options_ready",
  "option_selected",
  "booking_confirmed",
] as const;

export function furthestStatus(
  a: RequestStatus,
  b: RequestStatus | undefined,
): RequestStatus {
  const aIndex = statusOrder.indexOf(a);
  const bIndex = b ? statusOrder.indexOf(b) : -1;
  return statusOrder[Math.max(aIndex, bIndex)] ?? a;
}

export function getProgressStatus(request: {
  status: RequestStatus;
  progressStatus?: RequestStatus;
}): RequestStatus {
  return furthestStatus(request.status, request.progressStatus);
}
