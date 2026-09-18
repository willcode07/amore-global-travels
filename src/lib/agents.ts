import type { PaymentStatus, RequestStatus } from "@/lib/types";

/** Blank first, then named agents per client meeting notes. */
export const agents = [
  { id: "blank", name: "" },
  { id: "valerie", name: "Valerie Takpor" },
  { id: "jaleeza", name: "Jaleeza Smith-Breedlove" },
  { id: "alfreda", name: "Alfreda Gibson" },
  { id: "stephanie", name: "Stephanie Burney" },
  { id: "shonya", name: "Shonya Morrison" },
] as const;

export const assignableAgents = agents.filter((agent) => agent.id !== "blank");
export const defaultAssignedAgentId = "shonya";

export function parseAgentId(value: unknown): string | null {
  const id = typeof value === "string" ? value.trim().toLocaleLowerCase() : "";
  return (
    assignableAgents.find(
      (agent) => agent.id === id || agent.name.toLocaleLowerCase() === id,
    )?.id ?? null
  );
}

export function normalizeAssignedAgentId(value: unknown) {
  return parseAgentId(value) ?? defaultAssignedAgentId;
}

export function assignedAgentIdForPreference(preferredAgent: unknown) {
  const candidate =
    typeof preferredAgent === "string"
      ? preferredAgent.trim().toLocaleLowerCase()
      : "";
  const match = assignableAgents.find(
    (agent) =>
      agent.name.toLocaleLowerCase() === candidate ||
      agent.id.toLocaleLowerCase() === candidate,
  );
  return match?.id ?? defaultAssignedAgentId;
}

export function agentNameForId(id: unknown) {
  const normalized = normalizeAssignedAgentId(id);
  return (
    assignableAgents.find((agent) => agent.id === normalized)?.name ??
    "Shonya Morrison"
  );
}

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

export const tripTypeOptions = [
  { id: "vacation_package", label: "Vacation package" },
  { id: "all_inclusive", label: "All-inclusive" },
  { id: "cruise", label: "Cruise" },
  { id: "not_sure", label: "Not sure yet" },
] as const;

export const tripTypeLabels: Record<string, string> = {
  vacation_package: "Vacation package",
  all_inclusive: "All-inclusive",
  cruise: "Cruise",
  not_sure: "Not sure yet",
};

export const tripStyleOptions = [
  "Hotel / resort",
  "Cruise",
  "All-inclusive",
  "City / populated area",
  "Quiet / private",
  "Family-friendly",
  "Adventure / excursions",
  "Romantic getaway",
  "Group travel",
  "Celebration / milestone",
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

export const paymentLabels: Record<PaymentStatus, string> = {
  not_requested: "No payment yet",
  paid: "Paid",
  refunded: "Refunded",
};

export const paymentOrder = [
  "not_requested",
  "paid",
  "refunded",
] as const satisfies readonly PaymentStatus[];

export const installmentPlanLabel = "Installment plan";

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
