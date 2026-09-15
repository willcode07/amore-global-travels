"use client";

import {
  ResearchEvidence,
  ResearchKind,
  newResearchEvidence,
  researchKindLabel,
  researchLinksFor,
} from "@/lib/quote-research";
import type { TravelRequest } from "@/lib/types";

export type QuoteFormIssue = {
  field: string;
  message: string;
};

const researchKinds: ResearchKind[] = [
  "flight",
  "stay",
  "rental_car",
  "cruise",
];

function updateEvidence(
  evidence: ResearchEvidence[],
  id: string,
  patch: Partial<ResearchEvidence>,
) {
  return evidence.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function ResearchEvidencePanel({
  request,
  evidence,
  issues = [],
  onChange,
}: {
  request: TravelRequest;
  evidence: ResearchEvidence[];
  issues?: QuoteFormIssue[];
  onChange: (next: ResearchEvidence[]) => void;
}) {
  const researchLinks = researchLinksFor(request);
  const messagesFor = (id: string, field?: string) =>
    issues
      .filter((issue) =>
        issue.field === `researchEvidence.${id}` ||
        issue.field === `researchEvidence.${id}.${field}`,
      )
      .map((issue) => issue.message);
  const hasResearchIssue = issues.some(
    (issue) =>
      issue.field === "researchEvidence" ||
      issue.field.startsWith("researchEvidence."),
  );
  const generalIssues = issues.filter((issue) => issue.field === "researchEvidence");

  function inputClass(id: string, field: string) {
    return `w-full rounded-xl border bg-surface px-3 py-2 text-sm outline-none ring-gold focus:ring-2 ${
      messagesFor(id, field).length ? "border-red-500 bg-red-50" : "border-line"
    }`;
  }

  return (
    <section
      className={`rounded-3xl border p-4 md:p-5 ${
        hasResearchIssue ? "border-red-300 bg-red-50" : "border-line bg-cream"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl text-ink">Supplier research</p>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Search in a new tab, then record only the result you have personally
            verified. Search results stay preliminary until approved and are never
            treated as bookable rates automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {researchLinks.map((link) => (
            <a
              key={link.kind}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-gold-deep"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {generalIssues.length ? (
          <div className="rounded-2xl border border-red-200 bg-surface px-3 py-2 text-sm font-medium text-red-700">
            {generalIssues.map((issue) => (
              <p key={issue.message}>{issue.message}</p>
            ))}
          </div>
        ) : null}
        {evidence.map((item) => {
          const errors = issues
            .filter(
              (issue) =>
                issue.field === `researchEvidence.${item.id}` ||
                issue.field.startsWith(`researchEvidence.${item.id}.`),
            )
            .map((issue) => issue.message);
          const approved = item.status === "approved";

          return (
            <div key={item.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">
                  {researchKindLabel(item.kind)} evidence
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    approved
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {approved ? "Agent verified" : "Preliminary — not approved"}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-ink">Research type</span>
                  <select
                    value={item.kind}
                    onChange={(event) =>
                      onChange(
                        updateEvidence(evidence, item.id, {
                          kind: event.target.value as ResearchKind,
                        }),
                      )
                    }
                    className={inputClass(item.id, "kind")}
                  >
                    {researchKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {researchKindLabel(kind)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-ink">
                    Supplier / property / airline
                  </span>
                  <input
                    value={item.supplier}
                    onChange={(event) =>
                      onChange(updateEvidence(evidence, item.id, { supplier: event.target.value }))
                    }
                    placeholder="Who supplied this option?"
                    className={inputClass(item.id, "supplier")}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-ink">Observed amount</span>
                  <input
                    value={item.amount}
                    onChange={(event) =>
                      onChange(updateEvidence(evidence, item.id, { amount: event.target.value }))
                    }
                    placeholder="$0.00"
                    className={inputClass(item.id, "amount")}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-ink">Currency</span>
                  <select
                    value={item.currency}
                    onChange={(event) =>
                      onChange(updateEvidence(evidence, item.id, { currency: event.target.value }))
                    }
                    className={inputClass(item.id, "currency")}
                  >
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-ink">Price basis</span>
                  <input
                    value={item.priceBasis}
                    onChange={(event) =>
                      onChange(updateEvidence(evidence, item.id, { priceBasis: event.target.value }))
                    }
                    placeholder="Per person, per room, total party…"
                    className={inputClass(item.id, "priceBasis")}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-ink">Observed on</span>
                  <input
                    type="date"
                    value={item.observedAt}
                    onChange={(event) =>
                      onChange(updateEvidence(evidence, item.id, { observedAt: event.target.value }))
                    }
                    className={inputClass(item.id, "observedAt")}
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1 block font-medium text-ink">Source URL</span>
                  <input
                    type="url"
                    value={item.sourceUrl}
                    onChange={(event) =>
                      onChange(updateEvidence(evidence, item.id, { sourceUrl: event.target.value }))
                    }
                    placeholder="https://supplier.example/…"
                    className={inputClass(item.id, "sourceUrl")}
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1 block font-medium text-ink">Option and terms</span>
                  <textarea
                    value={item.description}
                    onChange={(event) =>
                      onChange(updateEvidence(evidence, item.id, { description: event.target.value }))
                    }
                    rows={2}
                    placeholder="Fare/room/cabin details, availability, cancellation terms…"
                    className={inputClass(item.id, "description")}
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1 block font-medium text-ink">Terms or conditions</span>
                  <textarea
                    value={item.terms}
                    onChange={(event) =>
                      onChange(updateEvidence(evidence, item.id, { terms: event.target.value }))
                    }
                    rows={2}
                    placeholder="Refundability, hold expiration, inclusions, or booking constraints"
                    className={inputClass(item.id, "terms")}
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={approved}
                    onChange={(event) =>
                      onChange(
                        updateEvidence(evidence, item.id, {
                          status: event.target.checked ? "approved" : "unverified",
                        }),
                      )
                    }
                  />
                  I verified this source and amount
                </label>
                <button
                  type="button"
                  onClick={() => onChange(evidence.filter((entry) => entry.id !== item.id))}
                  className="text-xs font-semibold text-red-700"
                >
                  Remove evidence
                </button>
              </div>
              {errors.length ? (
                <p className="mt-3 text-xs font-medium text-red-700">{errors[0]}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {researchKinds.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => onChange([...evidence, newResearchEvidence(kind, request)])}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-gold-deep"
          >
            Add {researchKindLabel(kind).toLowerCase()} evidence
          </button>
        ))}
      </div>
    </section>
  );
}
