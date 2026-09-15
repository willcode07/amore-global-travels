"use client";

import { FormEvent, useMemo, useState } from "react";
import { FileUploadField } from "@/components/FileUploadField";
import { PlaceSuggestInput } from "@/components/PlaceSuggestInput";
import { QuoteDocument } from "@/components/QuoteDocument";
import { QuotePreviewModal } from "@/components/QuotePreviewModal";
import { ResearchEvidencePanel } from "@/components/ResearchEvidencePanel";
import {
  amenityPresets,
  emptyProposal,
  mergeTravelerDetailsIntoProposal,
} from "@/lib/quotes";
import {
  evaluateQuoteQuality,
  QuoteQualityIssue,
} from "@/lib/quote-quality";
import { createId } from "@/lib/store";
import { QuoteEnhancement, QuoteLine, QuoteTier, TravelProposal, TravelRequest } from "@/lib/types";

type QuoteComposerProps = {
  request: TravelRequest;
  initial?: TravelProposal;
  saving?: boolean;
  onPublish: (quote: TravelProposal) => void;
  onCancel: () => void;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  issues = [],
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  issues?: Pick<QuoteQualityIssue, "message">[];
  type?: "text" | "url";
}) {
  const invalid = issues.length > 0;
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={`w-full rounded-xl border bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2 ${
          invalid ? "border-red-500 bg-red-50" : "border-line"
        }`}
      />
      {invalid ? <p className="mt-1 text-xs font-medium text-red-700">{issues[0].message}</p> : null}
    </label>
  );
}

function updateTier(tiers: QuoteTier[], id: string, patch: Partial<QuoteTier>) {
  return tiers.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier));
}

function IssueMessage({ issues }: { issues: QuoteQualityIssue[] }) {
  if (!issues.length) return null;
  return <p className="mt-1 text-xs font-medium text-red-700">{issues[0].message}</p>;
}

export function QuoteComposer({
  request,
  initial,
  saving,
  onPublish,
  onCancel,
}: QuoteComposerProps) {
  const [quote, setQuote] = useState<TravelProposal>(
    () => initial ?? emptyProposal(request),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [checkedQuoteFingerprint, setCheckedQuoteFingerprint] = useState<string | null>(
    null,
  );

  const recommendedName = useMemo(
    () => quote.flightTiers.find((tier) => tier.id === quote.recommendedFlightId)?.name,
    [quote.flightTiers, quote.recommendedFlightId],
  );
  const quoteFingerprint = useMemo(() => JSON.stringify(quote), [quote]);
  const quality = useMemo(() => evaluateQuoteQuality(quote), [quote]);
  const qualityIsCurrent = checkedQuoteFingerprint === quoteFingerprint;
  const canPublish = qualityIsCurrent && quality.canPublish;

  function fieldIssues(field: string) {
    return quality.errors.filter(
      (item) =>
        item.field === field ||
        item.relatedFields?.some((relatedField) => relatedField === field),
    );
  }

  function inputClass(field: string) {
    return `rounded-xl border bg-surface px-3 py-2 text-sm outline-none ring-gold focus:ring-2 ${
      fieldIssues(field).length ? "border-red-500 bg-red-50" : "border-line"
    }`;
  }

  function patch(next: Partial<TravelProposal>) {
    setQuote((current) => ({ ...current, ...next }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canPublish) {
      setCheckedQuoteFingerprint(quoteFingerprint);
      return;
    }
    onPublish(quote);
  }

  function runQualityCheck() {
    setCheckedQuoteFingerprint(quoteFingerprint);
  }

  function applyCalculatedTotal() {
    const totalFix = quality.autoFixes.find(
      (fix) => fix.id === "recalculate-investment-total",
    );
    if (totalFix) patch(totalFix.patch);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-ink">Generate a quote</h3>
          <p className="mt-1 text-sm text-muted">
            Traveler details are filled where known. Red fields still need verified
            information; preview the flyer, run Quality Check, then confirm and send.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setQuote((current) => mergeTravelerDetailsIntoProposal(current, request))
          }
          className="text-sm font-semibold text-gold-deep"
        >
          Load Traveller details
        </button>
      </div>

      {quote.agentNotes?.filter(Boolean).length ? (
        <details className="rounded-2xl border border-line bg-cream px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Traveler details loaded for this draft
          </summary>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {quote.agentNotes.filter(Boolean).map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.95fr)]">
        <div className="space-y-6">

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Occasion / headline"
          value={quote.occasionTitle}
          onChange={(occasionTitle) => patch({ occasionTitle })}
          issues={fieldIssues("occasionTitle")}
        />
        <div>
          <PlaceSuggestInput
            kind="destination"
            label="Destination line"
            value={quote.destinationLabel}
            onChange={(destinationLabel) => patch({ destinationLabel })}
            placeholder="Jamaica, Santorini..."
          />
          <IssueMessage issues={fieldIssues("destinationLabel")} />
        </div>
        <Field
          label="Dates"
          value={quote.dates}
          onChange={(dates) => patch({ dates })}
          issues={fieldIssues("dates")}
        />
        <Field
          label="Nights"
          value={quote.nights}
          onChange={(nights) => patch({ nights })}
          issues={fieldIssues("nights")}
        />
        <Field
          label="Travelers"
          value={quote.travelersLabel}
          onChange={(travelersLabel) => patch({ travelersLabel })}
          issues={fieldIssues("travelersLabel")}
        />
        <Field
          label="Route"
          value={quote.route}
          onChange={(route) => patch({ route })}
          issues={fieldIssues("route")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Resort / ship name"
          value={quote.resortName}
          onChange={(resortName) => patch({ resortName })}
          placeholder="Add the property or ship — still blank for you to fill"
          issues={fieldIssues("resortName")}
        />
        <Field
          label="Rating"
          value={quote.resortRating}
          onChange={(resortRating) => patch({ resortRating })}
          placeholder="e.g. 4.5"
        />
        <div>
          <PlaceSuggestInput
            kind="address"
            label="Address"
            value={quote.resortAddress}
            onChange={(resortAddress) => patch({ resortAddress })}
            onResolved={(place) =>
              patch({
                resortAddress: [place.address1 || place.label, place.city, place.state, place.zip]
                  .filter(Boolean)
                  .join(", "),
              })
            }
            placeholder="Start typing a street address"
          />
          <IssueMessage issues={fieldIssues("resortAddress")} />
        </div>
        <Field
          label="Room / cabin"
          value={quote.roomType}
          onChange={(roomType) => patch({ roomType })}
          issues={fieldIssues("roomType")}
        />
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink">Room details</span>
        <textarea
          value={quote.roomDetails}
          onChange={(event) => patch({ roomDetails: event.target.value })}
          rows={2}
          aria-invalid={fieldIssues("roomDetails").length > 0 || undefined}
          className={`w-full rounded-xl border bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2 ${
            fieldIssues("roomDetails").length ? "border-red-500 bg-red-50" : "border-line"
          }`}
        />
        <IssueMessage issues={fieldIssues("roomDetails")} />
      </label>
      <Field
        label="Photo URL (optional)"
        value={quote.resortImageUrl}
        onChange={(resortImageUrl) => patch({ resortImageUrl })}
        placeholder="https://…"
        issues={fieldIssues("resortImageUrl")}
        type="url"
      />

      <div>
        <p className="mb-2 text-sm font-medium text-ink">Amenities</p>
        <div className="flex flex-wrap gap-2">
          {amenityPresets.map((amenity) => {
            const active = quote.amenities.includes(amenity);
            return (
              <button
                key={amenity}
                type="button"
                onClick={() =>
                  patch({
                    amenities: active
                      ? quote.amenities.filter((item) => item !== amenity)
                      : [...quote.amenities, amenity],
                  })
                }
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  active ? "bg-gold text-on-gold" : "border border-line bg-surface text-muted"
                }`}
              >
                {amenity}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink">Investment lines</p>
        <div className="space-y-2">
          {quote.investmentLines.map((line, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <input
                value={line.label}
                onChange={(event) => {
                  const investmentLines: QuoteLine[] = quote.investmentLines.map((item, i) =>
                    i === index ? { ...item, label: event.target.value } : item,
                  );
                  patch({ investmentLines });
                }}
                aria-invalid={fieldIssues("investmentLines").length > 0 || undefined}
                className={inputClass("investmentLines")}
              />
              <input
                value={line.amount}
                onChange={(event) => {
                  const investmentLines: QuoteLine[] = quote.investmentLines.map((item, i) =>
                    i === index ? { ...item, amount: event.target.value } : item,
                  );
                  patch({ investmentLines });
                }}
                placeholder="$0.00"
                aria-invalid={fieldIssues("investmentLines").length > 0 || undefined}
                className={inputClass("investmentLines")}
              />
              <button
                type="button"
                disabled={quote.investmentLines.length === 1}
                onClick={() =>
                  patch({
                    investmentLines: quote.investmentLines.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
                className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <IssueMessage issues={fieldIssues("investmentLines")} />
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-gold-deep"
          onClick={() =>
            patch({
              investmentLines: [...quote.investmentLines, { label: "", amount: "" }],
            })
          }
        >
          Add investment line
        </button>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label="Stay total"
            value={quote.investmentTotal}
            onChange={(investmentTotal) => patch({ investmentTotal })}
            issues={fieldIssues("investmentTotal")}
          />
          <Field
            label="Cancellation"
            value={quote.cancellation}
            onChange={(cancellation) => patch({ cancellation })}
            issues={fieldIssues("cancellation")}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={quote.includeFlights}
          onChange={(event) => {
            const includeFlights = event.target.checked;
            if (includeFlights && quote.flightTiers.length === 0) {
              const flexId = createId("tier");
              patch({
                includeFlights,
                flightRoute: quote.flightRoute || quote.route,
                flightTiers: [
                  {
                    id: createId("tier"),
                    name: "Main cabin",
                    price: "TBD",
                    features: ["Airline TBD", "Times TBD"],
                  },
                  {
                    id: flexId,
                    name: "Flexible",
                    price: "TBD",
                    popular: true,
                    features: ["Airline TBD", "Times TBD"],
                  },
                ],
                recommendedFlightId: flexId,
              });
              return;
            }
            patch({ includeFlights });
          }}
        />
        Include flight options
      </label>
      {quote.includeFlights ? (
        <div className="space-y-3 rounded-2xl bg-cream p-4">
          <Field
            label="Flight route"
            value={quote.flightRoute}
            onChange={(flightRoute) => patch({ flightRoute })}
            issues={fieldIssues("flightRoute")}
          />
          {quote.flightTiers.map((tier) => (
            <div key={tier.id} className="grid gap-2 rounded-xl bg-surface p-3 md:grid-cols-2">
              <input
                value={tier.name}
                onChange={(event) =>
                  patch({ flightTiers: updateTier(quote.flightTiers, tier.id, { name: event.target.value }) })
                }
                placeholder="Tier name"
                aria-invalid={fieldIssues("flightTiers").length > 0 || undefined}
                className={inputClass("flightTiers")}
              />
              <input
                value={tier.price}
                onChange={(event) =>
                  patch({
                    flightTiers: updateTier(quote.flightTiers, tier.id, { price: event.target.value }),
                  })
                }
                placeholder="Price"
                aria-invalid={fieldIssues("flightTiers").length > 0 || undefined}
                className={inputClass("flightTiers")}
              />
              <textarea
                value={tier.features.join("\n")}
                onChange={(event) =>
                  patch({
                    flightTiers: updateTier(quote.flightTiers, tier.id, {
                      features: event.target.value.split("\n"),
                    }),
                  })
                }
                rows={2}
                placeholder="Features, one per line"
                className={`${inputClass("flightTiers")} md:col-span-2`}
              />
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={Boolean(tier.popular)}
                  onChange={(event) =>
                    patch({
                      flightTiers: quote.flightTiers.map((item) => ({
                        ...item,
                        popular: item.id === tier.id ? event.target.checked : false,
                      })),
                    })
                  }
                />
                Most popular
              </label>
            </div>
          ))}
          <IssueMessage issues={fieldIssues("flightTiers")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Recommended tier</span>
              <select
                value={quote.recommendedFlightId}
                onChange={(event) => patch({ recommendedFlightId: event.target.value })}
                className={`w-full rounded-xl border bg-surface px-3 py-2 outline-none ring-gold focus:ring-2 ${
                  fieldIssues("recommendedFlightId").length
                    ? "border-red-500 bg-red-50"
                    : "border-line"
                }`}
              >
                <option value="">None</option>
                {quote.flightTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </select>
              <IssueMessage issues={fieldIssues("recommendedFlightId")} />
            </label>
            <Field
              label={`Recommended total${recommendedName ? ` (${recommendedName})` : ""}`}
              value={quote.recommendedFlightTotal}
              onChange={(recommendedFlightTotal) => patch({ recommendedFlightTotal })}
              issues={fieldIssues("recommendedFlightTotal")}
            />
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium text-ink">Enhancements</p>
        {quote.enhancements.map((item, index) => (
          <div key={index} className="mb-2 grid gap-2 md:grid-cols-[1fr_140px_1fr_auto]">
            <input
              value={item.name}
              onChange={(event) => {
                const enhancements: QuoteEnhancement[] = quote.enhancements.map((row, i) =>
                  i === index ? { ...row, name: event.target.value } : row,
                );
                patch({ enhancements });
              }}
              placeholder="Add-on"
              aria-invalid={fieldIssues("enhancements").length > 0 || undefined}
              className={inputClass("enhancements")}
            />
            <input
              value={item.price}
              onChange={(event) => {
                const enhancements: QuoteEnhancement[] = quote.enhancements.map((row, i) =>
                  i === index ? { ...row, price: event.target.value } : row,
                );
                patch({ enhancements });
              }}
              placeholder="Price"
              aria-invalid={fieldIssues("enhancements").length > 0 || undefined}
              className={inputClass("enhancements")}
            />
            <input
              value={item.note ?? ""}
              onChange={(event) => {
                const enhancements: QuoteEnhancement[] = quote.enhancements.map((row, i) =>
                  i === index ? { ...row, note: event.target.value } : row,
                );
                patch({ enhancements });
              }}
              placeholder="Note"
              className={inputClass("enhancements")}
            />
            <button
              type="button"
              onClick={() =>
                patch({
                  enhancements: quote.enhancements.filter((_, itemIndex) => itemIndex !== index),
                })
              }
              className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
        <IssueMessage issues={fieldIssues("enhancements")} />
        <button
          type="button"
          className="text-sm font-semibold text-gold-deep"
          onClick={() =>
            patch({
              enhancements: [...quote.enhancements, { name: "", price: "", note: "" }],
            })
          }
        >
          Add enhancement
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={quote.includeProtection}
          onChange={(event) => patch({ includeProtection: event.target.checked })}
        />
        Include travel protection
      </label>
      {quote.includeProtection ? (
        <div className="space-y-3 rounded-2xl bg-cream p-4">
          <Field
            label="Provider"
            value={quote.protectionProvider}
            onChange={(protectionProvider) => patch({ protectionProvider })}
            issues={fieldIssues("protectionProvider")}
          />
          {quote.protectionTiers.map((tier) => (
            <div key={tier.id} className="grid gap-2 rounded-xl bg-surface p-3 md:grid-cols-2">
              <input
                value={tier.name}
                onChange={(event) =>
                  patch({
                    protectionTiers: updateTier(quote.protectionTiers, tier.id, {
                      name: event.target.value,
                    }),
                  })
                }
                aria-invalid={fieldIssues("protectionTiers").length > 0 || undefined}
                className={inputClass("protectionTiers")}
              />
              <input
                value={tier.price}
                onChange={(event) =>
                  patch({
                    protectionTiers: updateTier(quote.protectionTiers, tier.id, {
                      price: event.target.value,
                    }),
                  })
                }
                placeholder="Total"
                aria-invalid={fieldIssues("protectionTiers").length > 0 || undefined}
                className={inputClass("protectionTiers")}
              />
              <textarea
                value={tier.features.join("\n")}
                onChange={(event) =>
                  patch({
                    protectionTiers: updateTier(quote.protectionTiers, tier.id, {
                      features: event.target.value.split("\n"),
                    }),
                  })
                }
                rows={2}
                className={`${inputClass("protectionTiers")} md:col-span-2`}
              />
            </div>
          ))}
          <IssueMessage issues={fieldIssues("protectionTiers")} />
          <Field
            label="Optional upgrade line"
            value={quote.protectionUpgrade}
            onChange={(protectionUpgrade) => patch({ protectionUpgrade })}
            issues={fieldIssues("protectionUpgrade")}
          />
        </div>
      ) : null}

      <ResearchEvidencePanel
        request={request}
        evidence={quote.researchEvidence ?? []}
        issues={quality.errors}
        onChange={(researchEvidence) => patch({ researchEvidence })}
      />

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink">Notes (one per box)</span>
        <textarea
          value={quote.notes.join("\n")}
          onChange={(event) => patch({ notes: event.target.value.split("\n") })}
          rows={3}
          className={`w-full rounded-xl border bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2 ${
            fieldIssues("notes").length ? "border-red-500 bg-red-50" : "border-line"
          }`}
        />
        <IssueMessage issues={fieldIssues("notes")} />
      </label>
      <Field
        label="Closing thank-you"
        value={quote.thankYou}
        onChange={(thankYou) => patch({ thankYou })}
        issues={fieldIssues("thankYou")}
      />
      <Field
        label="Canva / flyer URL (optional)"
        value={quote.flyerUrl ?? ""}
        onChange={(flyerUrl) => patch({ flyerUrl })}
        issues={fieldIssues("flyerUrl")}
        type="url"
      />
      <FileUploadField
        tripId={request.id}
        kind="flyer"
        quoteId={quote.id}
        label="Or upload a flyer / PDF"
        onUploaded={(flyerUrl) => patch({ flyerUrl })}
      />
        </div>

        <aside id="quote-preview" className="space-y-3 xl:sticky xl:top-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-deep">
                Live preview
              </p>
              <p className="mt-1 text-sm text-muted">
                Updates as you edit. This is the flyer the traveler will review.
              </p>
            </div>
          </div>
          <QuoteDocument quote={quote} request={request} />
        </aside>
      </div>

      {qualityIsCurrent ? (
        <section
          aria-live="polite"
          className={`rounded-3xl border p-4 ${
            quality.errors.length
              ? "border-red-200 bg-red-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-display text-xl text-ink">Quality Check</h4>
              <p className="mt-1 text-sm text-muted">
                {quality.errors.length
                  ? `${quality.errors.length} blocking issue${quality.errors.length === 1 ? "" : "s"} must be resolved before this quote can be sent.`
                  : "No blocking issues found. This draft is ready to send."}
              </p>
            </div>
            {quality.autoFixes.length ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-medium text-red-800">
                  {quality.autoFixes[0].label}
                </p>
                <button
                  type="button"
                  onClick={applyCalculatedTotal}
                  className="rounded-full border border-red-300 bg-surface px-4 py-2 text-sm font-semibold text-red-800"
                >
                  Fix calculated totals
                </button>
              </div>
            ) : null}
          </div>
          {quality.errors.length ? (
            <ul className="mt-3 space-y-1 text-sm text-red-800">
              {quality.errors.map((item) => (
                <li key={`${item.code}-${item.field}-${item.message}`}>• {item.message}</li>
              ))}
            </ul>
          ) : null}
          {quality.warnings.length ? (
            <div className="mt-4 border-t border-emerald-200 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Review notes
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {quality.warnings.map((item) => (
                  <li key={`${item.code}-${item.field}-${item.message}`}>• {item.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <QuotePreviewModal
        open={previewOpen}
        quote={quote}
        request={request}
        onClose={() => setPreviewOpen(false)}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={runQualityCheck}
          className={`rounded-full px-5 py-3 text-sm font-semibold ${
            qualityIsCurrent
              ? quality.errors.length
                ? "border border-red-300 bg-red-50 text-red-800"
                : "border border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border border-line bg-surface text-ink"
          }`}
        >
          Quality Check
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !canPublish}
          title={
            canPublish
              ? "Ready to send"
              : "Run Quality Check and resolve all blocking issues before sending."
          }
          className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold disabled:opacity-60"
        >
          {saving ? "Sending..." : "Confirm and send"}
        </button>
      </div>
    </form>
  );
}

export function newTier(): QuoteTier {
  return { id: createId("tier"), name: "", price: "", features: [] };
}
