import type {
  InstallmentPayment,
  InstallmentStatus,
  PaymentPlanType,
  TravelRequest,
} from "@/lib/types";

function createPayId() {
  return `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const paymentPlanTypes = [
  "none",
  "pay_in_full",
  "deposit_and_balance",
  "installments",
  "custom",
] as const satisfies readonly PaymentPlanType[];

export const paymentPlanTypeLabels: Record<PaymentPlanType, string> = {
  none: "No payment plan",
  pay_in_full: "Pay in full",
  deposit_and_balance: "Deposit + final balance",
  installments: "Installment plan",
  custom: "Custom schedule",
};

export const installmentStatusLabels: Record<InstallmentStatus, string> = {
  scheduled: "Scheduled",
  paid: "Paid",
  overdue: "Overdue",
  waived: "Waived",
};

export function isMultiDatePaymentPlan(type: PaymentPlanType) {
  return (
    type === "deposit_and_balance" ||
    type === "installments" ||
    type === "custom"
  );
}

export function paymentPlanActive(type: PaymentPlanType) {
  return isMultiDatePaymentPlan(type);
}

export function emptyInstallment(
  partial?: Partial<InstallmentPayment>,
): InstallmentPayment {
  return {
    id: createPayId(),
    label: partial?.label ?? "",
    dueDate: partial?.dueDate ?? "",
    amount: partial?.amount ?? "",
    status: partial?.status ?? "scheduled",
    paidAt: partial?.paidAt,
    note: partial?.note ?? "",
  };
}

export function defaultScheduleForPlan(
  type: PaymentPlanType,
  existing: InstallmentPayment[] = [],
): InstallmentPayment[] {
  if (!isMultiDatePaymentPlan(type)) return [];
  if (existing.length > 0) return existing.map((item) => ({ ...item }));

  if (type === "deposit_and_balance") {
    return [
      emptyInstallment({ label: "Deposit" }),
      emptyInstallment({ label: "Final balance" }),
    ];
  }

  if (type === "installments") {
    return [
      emptyInstallment({ label: "Installment 1" }),
      emptyInstallment({ label: "Installment 2" }),
      emptyInstallment({ label: "Installment 3" }),
    ];
  }

  return [emptyInstallment({ label: "Payment 1" })];
}

export function normalizeInstallment(raw: unknown): InstallmentPayment | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<InstallmentPayment>;
  const status = (["scheduled", "paid", "overdue", "waived"] as const).includes(
    item.status as InstallmentStatus,
  )
    ? (item.status as InstallmentStatus)
    : "scheduled";
  return {
    id: String(item.id ?? createPayId()),
    label: String(item.label ?? "").trim(),
    dueDate: String(item.dueDate ?? "").trim(),
    amount: String(item.amount ?? "").trim(),
    status,
    paidAt: item.paidAt ? String(item.paidAt).trim() || undefined : undefined,
    note: item.note ? String(item.note).trim() : "",
  };
}

export function normalizePaymentPlanType(value: unknown): PaymentPlanType {
  if (paymentPlanTypes.includes(value as PaymentPlanType)) {
    return value as PaymentPlanType;
  }
  return "none";
}

export function derivePaymentPlanType(request: {
  paymentPlanType?: PaymentPlanType;
  installmentPlanActive?: boolean;
}): PaymentPlanType {
  if (request.paymentPlanType && request.paymentPlanType !== "none") {
    return normalizePaymentPlanType(request.paymentPlanType);
  }
  if (request.installmentPlanActive) return "installments";
  return normalizePaymentPlanType(request.paymentPlanType);
}

export function scheduleSummary(request: TravelRequest) {
  const schedule = request.paymentSchedule ?? [];
  if (!schedule.length) return "";
  const paid = schedule.filter((item) => item.status === "paid").length;
  return `${paid}/${schedule.length} payments recorded`;
}

export function nextDueInstallment(schedule: InstallmentPayment[]) {
  const open = schedule
    .filter((item) => item.status === "scheduled" || item.status === "overdue")
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return open[0] ?? null;
}
