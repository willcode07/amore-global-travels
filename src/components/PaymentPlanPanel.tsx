"use client";

import { useState } from "react";
import { formatDisplayDate } from "@/lib/intake";
import {
  emptyInstallment,
  installmentStatusLabels,
  isMultiDatePaymentPlan,
  nextDueInstallment,
  paymentPlanTypeLabels,
  scheduleSummary,
} from "@/lib/payments";
import type {
  InstallmentPayment,
  InstallmentStatus,
  PaymentPlanType,
  TravelRequest,
} from "@/lib/types";

type PaymentPlanPanelProps = {
  request: TravelRequest;
  editable?: boolean;
  saving?: boolean;
  onSavePlan?: (input: {
    paymentPlanType: PaymentPlanType;
    paymentSchedule: InstallmentPayment[];
  }) => void | Promise<void>;
};

const planChoices: PaymentPlanType[] = [
  "none",
  "pay_in_full",
  "deposit_and_balance",
  "installments",
  "custom",
];

const statusChoices: InstallmentStatus[] = [
  "scheduled",
  "paid",
  "overdue",
  "waived",
];

function starterRows(type: PaymentPlanType): InstallmentPayment[] {
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
  if (type === "custom") {
    return [emptyInstallment({ label: "Payment 1" })];
  }
  return [];
}

export function PaymentPlanPanel({
  request,
  editable = false,
  saving = false,
  onSavePlan,
}: PaymentPlanPanelProps) {
  const planType = request.paymentPlanType ?? "none";
  const schedule = request.paymentSchedule ?? [];

  if (!editable) {
    if (planType === "none" && schedule.length === 0) return null;
    const nextDue = nextDueInstallment(schedule);
    return (
      <section className="rounded-3xl border border-line bg-surface p-5 md:p-6">
        <h3 className="font-display text-xl text-ink">Payment plan</h3>
        <p className="mt-1 text-sm text-muted">
          {paymentPlanTypeLabels[planType]}
          {scheduleSummary(request) ? ` · ${scheduleSummary(request)}` : ""}
        </p>
        {nextDue ? (
          <p className="mt-3 text-sm text-ink">
            Next due:{" "}
            <span className="font-semibold">
              {nextDue.label || "Payment"}
              {nextDue.amount ? ` · ${nextDue.amount}` : ""}
              {nextDue.dueDate ? ` · ${formatDisplayDate(nextDue.dueDate)}` : ""}
            </span>
          </p>
        ) : null}
        {schedule.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {schedule.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-cream px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-ink">
                    {item.label || "Payment"}
                    {item.amount ? (
                      <span className="ml-2 font-medium text-gold-deep">
                        {item.amount}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-muted">
                    Due {item.dueDate ? formatDisplayDate(item.dueDate) : "—"}
                    {item.status === "paid" && item.paidAt
                      ? ` · Paid ${formatDisplayDate(item.paidAt)}`
                      : ""}
                    {item.note ? ` · ${item.note}` : ""}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.status === "paid"
                      ? "bg-gold/20 text-gold-deep"
                      : item.status === "overdue"
                        ? "bg-red-100 text-red-800"
                        : "bg-white text-muted"
                  }`}
                >
                  {installmentStatusLabels[item.status]}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  return (
    <PaymentPlanEditor
      key={`${request.id}-${planType}-${schedule.length}`}
      initialType={planType}
      initialSchedule={schedule}
      saving={saving}
      onSavePlan={onSavePlan}
    />
  );
}

function PaymentPlanEditor({
  initialType,
  initialSchedule,
  saving,
  onSavePlan,
}: {
  initialType: PaymentPlanType;
  initialSchedule: InstallmentPayment[];
  saving: boolean;
  onSavePlan?: PaymentPlanPanelProps["onSavePlan"];
}) {
  const [planType, setPlanType] = useState(initialType);
  const [rows, setRows] = useState<InstallmentPayment[]>(
    initialSchedule.map((item) => ({ ...item })),
  );

  function selectPlanType(next: PaymentPlanType) {
    setPlanType(next);
    if (!isMultiDatePaymentPlan(next)) {
      setRows([]);
      void onSavePlan?.({ paymentPlanType: next, paymentSchedule: [] });
      return;
    }
    setRows((current) => (current.length ? current : starterRows(next)));
  }

  return (
    <section className="mt-4 rounded-3xl border border-line bg-cream/60 p-4 md:p-5">
      <div>
        <h3 className="font-display text-xl text-ink">Payment plan</h3>
        <p className="mt-1 text-sm text-muted">
          Track the plan type and every payment date for installment travelers.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {planChoices.map((type) => (
          <button
            key={type}
            type="button"
            disabled={saving}
            onClick={() => selectPlanType(type)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              planType === type
                ? "bg-gold text-on-gold"
                : "border border-line bg-surface text-muted"
            }`}
          >
            {paymentPlanTypeLabels[type]}
          </button>
        ))}
      </div>

      {isMultiDatePaymentPlan(planType) ? (
        <div className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid gap-3 rounded-2xl border border-line bg-surface p-3 md:grid-cols-[1.1fr_1fr_0.9fr_1fr_auto]"
            >
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-ink">Label</span>
                <input
                  value={row.label}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRows((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, label: value } : item,
                      ),
                    );
                  }}
                  placeholder={`Payment ${index + 1}`}
                  className="w-full rounded-xl border border-line px-3 py-2 outline-none ring-gold focus:ring-2"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-ink">Due date</span>
                <input
                  type="date"
                  value={row.dueDate}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRows((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, dueDate: value } : item,
                      ),
                    );
                  }}
                  className="w-full rounded-xl border border-line px-3 py-2 outline-none ring-gold focus:ring-2"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-ink">Amount</span>
                <input
                  value={row.amount}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRows((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, amount: value } : item,
                      ),
                    );
                  }}
                  placeholder="$500"
                  className="w-full rounded-xl border border-line px-3 py-2 outline-none ring-gold focus:ring-2"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-ink">Status</span>
                <select
                  value={row.status}
                  onChange={(event) => {
                    const value = event.target.value as InstallmentStatus;
                    setRows((current) =>
                      current.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              status: value,
                              paidAt:
                                value === "paid"
                                  ? item.paidAt ||
                                    new Date().toISOString().slice(0, 10)
                                  : undefined,
                            }
                          : item,
                      ),
                    );
                  }}
                  className="w-full rounded-xl border border-line px-3 py-2 outline-none ring-gold focus:ring-2"
                >
                  {statusChoices.map((status) => (
                    <option key={status} value={status}>
                      {installmentStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={saving || rows.length <= 1}
                onClick={() =>
                  setRows((current) => current.filter((_, i) => i !== index))
                }
                className="self-end rounded-full border border-line px-3 py-2 text-xs font-semibold text-muted disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              setRows((current) => [
                ...current,
                emptyInstallment({ label: `Payment ${current.length + 1}` }),
              ])
            }
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink"
          >
            Add payment date
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Multi-date schedules appear for deposit + balance, installments, or
          custom plans.
        </p>
      )}

      <button
        type="button"
        disabled={saving || !onSavePlan}
        onClick={() =>
          void onSavePlan?.({
            paymentPlanType: planType,
            paymentSchedule: rows,
          })
        }
        className="mt-4 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-on-gold disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save payment plan"}
      </button>
    </section>
  );
}
