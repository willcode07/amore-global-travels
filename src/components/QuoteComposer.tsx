"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FileUploadField } from "@/components/FileUploadField";
import { PlaceSuggestInput } from "@/components/PlaceSuggestInput";
import { QuoteDocument } from "@/components/QuoteDocument";
import { QuotePreviewModal } from "@/components/QuotePreviewModal";
import { ResearchEvidencePanel } from "@/components/ResearchEvidencePanel";
import {
  amenityPresets,
  emptyFlyerProposal,
  emptyProposal,
  mergeTravelerDetailsIntoProposal,
} from "@/lib/quotes";
import {
  calculatedStayTotal,
  evaluateQuoteQuality,
  QuoteQualityField,
  QuoteQualityIssue,
} from "@/lib/quote-quality";
import { clearQuoteDraft, readQuoteDraft, writeQuoteDraft } from "@/lib/quote-drafts";
import { isUsableImageUrl } from "@/lib/quote-media";
import { createId } from "@/lib/store";
import { QuoteEnhancement, QuoteLine, QuoteTier, TravelProposal, TravelRequest } from "@/lib/types";

type ComposerMode = "quote" | "flyer";

type QuoteComposerProps = {
  request: TravelRequest;
  initial?: TravelProposal;
  mode?: ComposerMode;
  saving?: boolean;
  replacing?: boolean;
  onPublish: (quote: TravelProposal) => void;
  onCancel: () => void;
};

function fieldId(field: string) {
  return `quote-field-${field}`;
}

function jumpToField(field: string) {
  const node = document.getElementById(fieldId(field));
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  const input = node.querySelector("input, textarea, select, button") as HTMLElement | null;
  input?.focus();
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  issues = [],
  required,
  readOnly,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  issues?: Pick<QuoteQualityIssue, "message">[];
  required?: boolean;
  readOnly?: boolean;
}) {
  const invalid = issues.length > 0;
  return (
    <label id={id} className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={`w-full rounded-xl border bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2 ${
          invalid ? "border-red-500 bg-red-50" : "border-line"
        } ${readOnly ? "bg-cream" : ""}`}
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

function groupLabel(field: QuoteQualityField | string) {
  if (field === "investmentLines" || field === "investmentTotal" || field === "cancellation") {
    return "Price";
  }
  if (String(field).startsWith("researchEvidence") || field === "researchEvidence") {
    return "Research";
  }
  if (
    field === "flightRoute" ||
    field === "flightTiers" ||
    field === "recommendedFlightId" ||
    field === "recommendedFlightTotal"
  ) {
    return "Flights";
  }
  if (field === "flyerUrl" || field === "resortImageUrl") return "Media";
  return "Stay";
}

function jumpFieldFor(issue: QuoteQualityIssue) {
  const field = String(issue.field);
  if (field.startsWith("researchEvidence")) return "researchEvidence";
  return field;
}

export function QuoteComposer({
  request,
  initial,
  mode = "quote",
  saving,
  replacing,
  onPublish,
  onCancel,
}: QuoteComposerProps) {
  const isFlyer = mode === "flyer";
  const [quote, setQuote] = useState<TravelProposal>(() => {
    const draft = readQuoteDraft(request.id, mode);
    if (draft && (!initial || draft.id === initial.id || !replacing)) {
      return draft;
    }
    if (initial) return initial;
    return isFlyer ? emptyFlyerProposal(request) : emptyProposal(request);
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const skipFirstSave = useRef(true);

  const recommendedName = useMemo(
    () => quote.flightTiers.find((tier) => tier.id === quote.recommendedFlightId)?.name,
    [quote.flightTiers, quote.recommendedFlightId],
  );
  const quality = useMemo(() => evaluateQuoteQuality(quote), [quote]);
  const canPublish = quality.canPublish;
  const publishedMatch = request.quotes.find((item) => item.id === quote.id);
  const lastSent = request.quoteHistory?.[0] ?? publishedMatch;
  const photoOk = !quote.resortImageUrl.trim() || isUsableImageUrl(quote.resortImageUrl);

  useEffect(() => {
    if (!isFlyer || quote.quoteKind === "media") return;
    setQuote((current) =>
      current.quoteKind === "media" ? current : { ...current, quoteKind: "media" },
    );
  }, [isFlyer, quote.quoteKind]);

  useEffect(() => {
    setQuote((current) => {
      const next = calculatedStayTotal(current);
      if (!next || next === current.investmentTotal) return current;
      return { ...current, investmentTotal: next };
    });
  }, [quote.investmentLines]);

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      writeQuoteDraft(request.id, quote, mode);
      setDraftSavedAt(new Date().toLocaleTimeString());
    }, 700);
    return () => window.clearTimeout(timer);
  }, [quote, request.id, mode]);

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

  function sendQuote() {
    const payload = quote.recordResearch
      ? quote
      : { ...quote, researchEvidence: [] };
    clearQuoteDraft(request.id, mode);
    onPublish(payload);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canPublish) {
      const first = quality.errors[0];
      if (first) jumpToField(jumpFieldFor(first));
      return;
    }
    if (publishedMatch || replacing) {
      setConfirmReplace(true);
      return;
    }
    sendQuote();
  }

  const groupedErrors = quality.errors.reduce<Record<string, QuoteQualityIssue[]>>((groups, issue) => {
    const label = groupLabel(issue.field);
    groups[label] = [...(groups[label] ?? []), issue];
    return groups;
  }, {});

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-ink">
            {isFlyer ? "Attach a flyer" : replacing ? "Revise this quote" : "Generate a quote"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {isFlyer
              ? "Title, total, and a Canva/PDF/image link. Send when those three are filled."
              : "Required: property, room, stay total, taxes/fees, cancellation. Flights and research stay off unless you turn them on."}
          </p>
          {draftSavedAt ? (
            <p className="mt-1 text-xs text-muted">Draft saved {draftSavedAt}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {!isFlyer ? (
            <button
              type="button"
              onClick={() =>
                setQuote((current) => mergeTravelerDetailsIntoProposal(current, request))
              }
              className="text-sm font-semibold text-gold-deep"
            >
              Load Traveller details
            </button>
          ) : null}
          {lastSent ? (
            <button
              type="button"
              onClick={() => setQuote(lastSent)}
              className="text-sm font-semibold text-gold-deep"
            >
              Restore last sent
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              clearQuoteDraft(request.id, mode);
              setQuote(isFlyer ? emptyFlyerProposal(request) : emptyProposal(request));
              setDraftSavedAt("");
            }}
            className="text-sm font-semibold text-red-800"
          >
            Discard draft
          </button>
        </div>
      </div>

      {quote.agentNotes?.filter(Boolean).length && !isFlyer ? (
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
              id={fieldId("occasionTitle")}
              label="Headline"
              value={quote.occasionTitle}
              onChange={(occasionTitle) => patch({ occasionTitle })}
              issues={fieldIssues("occasionTitle")}
              required
            />
            <div id={fieldId("destinationLabel")}>
              <PlaceSuggestInput
                kind="destination"
                label="Destination *"
                value={quote.destinationLabel}
                onChange={(destinationLabel) => patch({ destinationLabel })}
                placeholder="Jamaica, Santorini..."
              />
              <IssueMessage issues={fieldIssues("destinationLabel")} />
            </div>
            <Field
              id={fieldId("dates")}
              label="Dates"
              value={quote.dates}
              onChange={(dates) => patch({ dates })}
              issues={fieldIssues("dates")}
              required
            />
            <Field
              id={fieldId("travelersLabel")}
              label="Travelers"
              value={quote.travelersLabel}
              onChange={(travelersLabel) => patch({ travelersLabel })}
              issues={fieldIssues("travelersLabel")}
              required
            />
          </div>

          {isFlyer ? (
            <>
              <div id={fieldId("flyerUrl")} className="space-y-3">
                <Field
                  label="Flyer / Canva / PDF URL"
                  value={quote.flyerUrl ?? ""}
                  onChange={(flyerUrl) => patch({ flyerUrl })}
                  issues={fieldIssues("flyerUrl")}
                  placeholder="https://…"
                  required
                />
                <FileUploadField
                  tripId={request.id}
                  kind="flyer"
                  quoteId={quote.id}
                  label="Or upload a flyer / PDF"
                  onUploaded={(flyerUrl) => patch({ flyerUrl })}
                />
              </div>
              <div id={fieldId("investmentTotal")}>
                <Field
                  label="Total shown on the flyer"
                  value={quote.investmentTotal}
                  onChange={(investmentTotal) => patch({ investmentTotal })}
                  placeholder="$0.00"
                  issues={fieldIssues("investmentTotal")}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  id={fieldId("resortName")}
                  label="Property / ship"
                  value={quote.resortName}
                  onChange={(resortName) => patch({ resortName })}
                  placeholder="Hotel, resort, or ship name"
                  issues={fieldIssues("resortName")}
                  required
                />
                <Field
                  id={fieldId("roomType")}
                  label="Room / cabin"
                  value={quote.roomType}
                  onChange={(roomType) => patch({ roomType })}
                  issues={fieldIssues("roomType")}
                  required
                />
              </div>
              <div id={fieldId("investmentLines")}>
                <p className="mb-2 text-sm font-medium text-ink">Price *</p>
                <div className="space-y-2">
                  {quote.investmentLines.map((line, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                      <input
                        value={line.label}
                        onChange={(event) => {
                          const investmentLines: QuoteLine[] = quote.investmentLines.map(
                            (item, i) =>
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
                          const investmentLines: QuoteLine[] = quote.investmentLines.map(
                            (item, i) =>
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
                            investmentLines: quote.investmentLines.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
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
                  Add line
                </button>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    id={fieldId("investmentTotal")}
                    label="Total (USD, auto)"
                    value={quote.investmentTotal}
                    onChange={(investmentTotal) => patch({ investmentTotal })}
                    issues={fieldIssues("investmentTotal")}
                    readOnly
                    required
                  />
                  <Field
                    id={fieldId("cancellation")}
                    label="Cancellation"
                    value={quote.cancellation}
                    onChange={(cancellation) => patch({ cancellation })}
                    issues={fieldIssues("cancellation")}
                    required
                  />
                </div>
              </div>

              <details className="rounded-2xl border border-line px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  Optional stay details
                </summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    id={fieldId("nights")}
                    label="Nights"
                    value={quote.nights}
                    onChange={(nights) => patch({ nights })}
                    issues={fieldIssues("nights")}
                  />
                  <Field
                    id={fieldId("route")}
                    label="Route"
                    value={quote.route}
                    onChange={(route) => patch({ route })}
                    issues={fieldIssues("route")}
                  />
                  <Field
                    label="Rating"
                    value={quote.resortRating}
                    onChange={(resortRating) => patch({ resortRating })}
                    placeholder="e.g. 4.5"
                  />
                  <Field
                    label="Address"
                    value={quote.resortAddress}
                    onChange={(resortAddress) => patch({ resortAddress })}
                  />
                </div>
                <label id={fieldId("roomDetails")} className="mt-4 block text-sm">
                  <span className="mb-1.5 block font-medium text-ink">Room details</span>
                  <textarea
                    value={quote.roomDetails}
                    onChange={(event) => patch({ roomDetails: event.target.value })}
                    rows={2}
                    className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2"
                  />
                </label>
                <div id={fieldId("resortImageUrl")} className="mt-4">
                  <Field
                    label="Photo URL"
                    value={quote.resortImageUrl}
                    onChange={(resortImageUrl) => patch({ resortImageUrl })}
                    placeholder="https://…jpg"
                    issues={fieldIssues("resortImageUrl")}
                  />
                  {quote.resortImageUrl.trim() && !photoOk ? (
                    <p className="mt-1 text-xs font-medium text-red-700">
                      That link will not preview. Use a photo URL or leave it blank.
                    </p>
                  ) : null}
                </div>
                <div className="mt-4">
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
                            active
                              ? "bg-gold text-on-gold"
                              : "border border-line bg-surface text-muted"
                          }`}
                        >
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </details>

              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={quote.includeFlights}
                  onChange={(event) => {
                    const includeFlights = event.target.checked;
                    if (includeFlights && quote.flightTiers.length === 0) {
                      const mainId = createId("tier");
                      patch({
                        includeFlights,
                        flightRoute: quote.flightRoute || quote.route,
                        flightTiers: [
                          {
                            id: mainId,
                            name: "Main cabin",
                            price: "",
                            features: [""],
                          },
                        ],
                        recommendedFlightId: mainId,
                      });
                      return;
                    }
                    patch({ includeFlights });
                  }}
                />
                Include flights
              </label>
              {quote.includeFlights ? (
                <div id={fieldId("flightTiers")} className="space-y-3 rounded-2xl bg-cream p-4">
                  <Field
                    id={fieldId("flightRoute")}
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
                          patch({
                            flightTiers: updateTier(quote.flightTiers, tier.id, {
                              name: event.target.value,
                            }),
                          })
                        }
                        placeholder="Cabin"
                        className={inputClass("flightTiers")}
                      />
                      <input
                        value={tier.price}
                        onChange={(event) =>
                          patch({
                            flightTiers: updateTier(quote.flightTiers, tier.id, {
                              price: event.target.value,
                            }),
                          })
                        }
                        placeholder="$0.00"
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
                        placeholder="Airline and times, one per line"
                        className={`${inputClass("flightTiers")} md:col-span-2`}
                      />
                    </div>
                  ))}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium">Recommended cabin</span>
                      <select
                        value={quote.recommendedFlightId}
                        onChange={(event) => patch({ recommendedFlightId: event.target.value })}
                        className="w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none ring-gold focus:ring-2"
                      >
                        <option value="">None</option>
                        {quote.flightTiers.map((tier) => (
                          <option key={tier.id} value={tier.id}>
                            {tier.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label={`Flight total${recommendedName ? ` (${recommendedName})` : ""}`}
                      value={quote.recommendedFlightTotal}
                      onChange={(recommendedFlightTotal) => patch({ recommendedFlightTotal })}
                      issues={fieldIssues("recommendedFlightTotal")}
                    />
                  </div>
                </div>
              ) : null}

              <details className="rounded-2xl border border-line px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  Extras (cars, protection, amenities notes)
                </summary>
                <div className="mt-4 space-y-3">
                  {quote.enhancements.map((item, index) => (
                    <div key={index} className="grid gap-2 md:grid-cols-[1fr_140px_1fr_auto]">
                      <input
                        value={item.name}
                        onChange={(event) => {
                          const enhancements: QuoteEnhancement[] = quote.enhancements.map(
                            (row, i) =>
                              i === index ? { ...row, name: event.target.value } : row,
                          );
                          patch({ enhancements });
                        }}
                        placeholder="Add-on"
                        className={inputClass("enhancements")}
                      />
                      <input
                        value={item.price}
                        onChange={(event) => {
                          const enhancements: QuoteEnhancement[] = quote.enhancements.map(
                            (row, i) =>
                              i === index ? { ...row, price: event.target.value } : row,
                          );
                          patch({ enhancements });
                        }}
                        placeholder="$0.00"
                        className={inputClass("enhancements")}
                      />
                      <input
                        value={item.note ?? ""}
                        onChange={(event) => {
                          const enhancements: QuoteEnhancement[] = quote.enhancements.map(
                            (row, i) =>
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
                            enhancements: quote.enhancements.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                        className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-sm font-semibold text-gold-deep"
                    onClick={() =>
                      patch({
                        enhancements: [
                          ...quote.enhancements,
                          { name: "", price: "", note: "" },
                        ],
                      })
                    }
                  >
                    Add extra
                  </button>
                  <label className="flex items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={quote.includeProtection}
                      onChange={(event) => patch({ includeProtection: event.target.checked })}
                    />
                    Include travel protection
                  </label>
                </div>
              </details>

              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={Boolean(quote.recordResearch)}
                  onChange={(event) => patch({ recordResearch: event.target.checked })}
                />
                Record research evidence
              </label>
              {quote.recordResearch ? (
                <div id={fieldId("researchEvidence")}>
                  <ResearchEvidencePanel
                    request={request}
                    evidence={quote.researchEvidence ?? []}
                    issues={quality.errors}
                    onChange={(researchEvidence) => patch({ researchEvidence })}
                  />
                </div>
              ) : null}

              <details className="rounded-2xl border border-line px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  Notes shown to the traveler
                </summary>
                <label className="mt-4 block text-sm">
                  <span className="mb-1.5 block font-medium text-ink">Notes</span>
                  <textarea
                    value={quote.notes.join("\n")}
                    onChange={(event) => patch({ notes: event.target.value.split("\n") })}
                    rows={3}
                    className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2"
                  />
                </label>
                <div className="mt-3">
                  <Field
                    label="Closing thank-you"
                    value={quote.thankYou}
                    onChange={(thankYou) => patch({ thankYou })}
                    issues={fieldIssues("thankYou")}
                  />
                </div>
              </details>
            </>
          )}
        </div>

        <aside id="quote-preview" className="space-y-3 xl:sticky xl:top-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-deep">
            Live preview
          </p>
          <QuoteDocument quote={quote} request={request} />
        </aside>
      </div>

      <section
        aria-live="polite"
        className={`rounded-3xl border p-4 ${
          quality.errors.length
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <h4 className="font-display text-xl text-ink">Quality Check</h4>
        <p className="mt-1 text-sm text-muted">
          {quality.errors.length
            ? `${quality.errors.length} item${quality.errors.length === 1 ? "" : "s"} left before Send is enabled.`
            : "Ready to send."}
        </p>
        {Object.entries(groupedErrors).map(([label, issues]) => (
          <div key={label} className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-800">
              {label}
            </p>
            <ul className="mt-1 space-y-1 text-sm text-red-800">
              {issues.map((item) => (
                <li key={`${item.code}-${item.field}-${item.message}`}>
                  <button
                    type="button"
                    onClick={() => jumpToField(jumpFieldFor(item))}
                    className="text-left underline underline-offset-2"
                  >
                    {item.message} — Jump to field
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {quality.warnings.length ? (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {quality.warnings.map((item) => (
              <li key={`${item.code}-${item.field}-${item.message}`}>• {item.message}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <QuotePreviewModal
        open={previewOpen}
        quote={quote}
        request={request}
        onClose={() => setPreviewOpen(false)}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            writeQuoteDraft(request.id, quote, mode);
            setDraftSavedAt(new Date().toLocaleTimeString());
          }}
          className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
        >
          Preview
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
              : "Fill the starred fields. Send turns on when Quality Check is clear."
          }
          className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold disabled:opacity-60"
        >
          {saving ? "Sending..." : "Confirm and send"}
        </button>
      </div>
      {!canPublish ? (
        <p className="text-xs text-muted">
          Send stays off until the starred fields are filled. Use Jump to field on each Quality Check item.
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmReplace}
        title="Replace the quote already sent?"
        body="This overwrites the traveler’s current quote. The previous version is kept in history so you can restore it."
        confirmLabel="Replace quote"
        onCancel={() => setConfirmReplace(false)}
        onConfirm={() => {
          setConfirmReplace(false);
          sendQuote();
        }}
      />
    </form>
  );
}

export function newTier(): QuoteTier {
  return { id: createId("tier"), name: "", price: "", features: [] };
}
