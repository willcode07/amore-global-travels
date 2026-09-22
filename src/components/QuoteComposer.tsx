"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FileUploadField } from "@/components/FileUploadField";
import { PlaceSuggestInput } from "@/components/PlaceSuggestInput";
import { QuoteDocument } from "@/components/QuoteDocument";
import { QuotePreviewModal } from "@/components/QuotePreviewModal";
import {
  amenityPresets,
  emptyFlyerProposal,
  emptyProposal,
  mergeTravelerDetailsIntoProposal,
  normalizeQuotePriceLines,
  packagePriceLabel,
  PRICE_LINE_FLIGHT,
  PRICE_LINE_SPECIAL,
  PRICE_LINE_TRANSPORT,
} from "@/lib/quotes";
import { calculatedStayTotal } from "@/lib/quote-quality";
import { clearQuoteDraft, readQuoteDraft, writeQuoteDraft } from "@/lib/quote-drafts";
import { isUsableImageUrl } from "@/lib/quote-media";
import { QuoteLine, TravelProposal, TravelRequest } from "@/lib/types";

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

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-line bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2 ${
          readOnly ? "bg-cream" : ""
        }`}
      />
    </label>
  );
}

function PriceSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-cream/50 px-4 py-4">
      <h4 className="font-display text-lg text-ink">{title}</h4>
      {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function lineAmount(lines: QuoteLine[], label: string) {
  return lines.find((line) => line.label === label)?.amount ?? "";
}

function lineNote(lines: QuoteLine[], label: string) {
  return lines.find((line) => line.label === label)?.note ?? "";
}

function setLine(
  lines: QuoteLine[],
  label: string,
  patch: Partial<QuoteLine>,
): QuoteLine[] {
  if (!lines.some((line) => line.label === label)) {
    return [...lines, { label, amount: "", ...patch }];
  }
  return lines.map((line) => (line.label === label ? { ...line, ...patch } : line));
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
  const tripType = request.intake?.tripType || request.trip.tripType;
  const packageLabel = packagePriceLabel(tripType);
  const [quote, setQuote] = useState<TravelProposal>(() => {
    const draft = readQuoteDraft(request.id, mode);
    const raw =
      draft && (!initial || draft.id === initial.id || !replacing)
        ? draft
        : initial
          ? initial
          : isFlyer
            ? emptyFlyerProposal(request)
            : emptyProposal(request);
    return isFlyer ? raw : normalizeQuotePriceLines(raw, tripType);
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmBlanks, setConfirmBlanks] = useState(false);
  const skipFirstSave = useRef(true);
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

  function patch(next: Partial<TravelProposal>) {
    setQuote((current) => ({ ...current, ...next }));
  }

  function patchPrice(label: string, next: Partial<QuoteLine>) {
    setQuote((current) => ({
      ...current,
      investmentLines: setLine(current.investmentLines, label, next),
    }));
  }

  function sendQuote() {
    clearQuoteDraft(request.id, mode);
    onPublish({ ...quote, researchEvidence: [], recordResearch: false });
  }

  function emptyPriceSections() {
    return [PRICE_LINE_FLIGHT, PRICE_LINE_TRANSPORT, PRICE_LINE_SPECIAL].filter(
      (label) => !lineAmount(quote.investmentLines, label).trim(),
    );
  }

  function continueToSend() {
    if (publishedMatch || replacing) {
      setConfirmReplace(true);
      return;
    }
    sendQuote();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isFlyer && emptyPriceSections().length > 0) {
      setConfirmBlanks(true);
      return;
    }
    continueToSend();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-ink">
            {isFlyer
              ? "Attach a flyer"
              : replacing
                ? "Revise this quote"
                : request.quotes.length
                  ? "Add another option"
                  : "Generate a quote"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {isFlyer
              ? "Title, total, and a Canva/PDF/image link."
              : replacing
                ? `This replaces the quote the traveler already has. Price ${packageLabel.toLowerCase()}, flights, transportation, and special requests.`
                : request.quotes.length
                  ? `This stays as its own option. Quotes already sent remain on the dashboard. Price ${packageLabel.toLowerCase()}, flights, transportation, and special requests.`
                  : `Price ${packageLabel.toLowerCase()}, flights, transportation, and special requests. Preview, then send.`}
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
                setQuote((current) =>
                  normalizeQuotePriceLines(
                    mergeTravelerDetailsIntoProposal(current, request),
                    tripType,
                  ),
                )
              }
              className="text-sm font-semibold text-gold-deep"
            >
              Load Traveller details
            </button>
          ) : null}
          {lastSent ? (
            <button
              type="button"
              onClick={() =>
                setQuote(
                  isFlyer ? lastSent : normalizeQuotePriceLines(lastSent, tripType),
                )
              }
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
              label="Headline"
              value={quote.occasionTitle}
              onChange={(occasionTitle) => patch({ occasionTitle })}
            />
            <PlaceSuggestInput
              kind="destination"
              label="Destination"
              value={quote.destinationLabel}
              onChange={(destinationLabel) => patch({ destinationLabel })}
              placeholder="Jamaica, Santorini..."
            />
            <Field
              label="Dates"
              value={quote.dates}
              onChange={(dates) => patch({ dates })}
            />
            <Field
              label="Travelers"
              value={quote.travelersLabel}
              onChange={(travelersLabel) => patch({ travelersLabel })}
            />
          </div>

          {isFlyer ? (
            <>
              <div className="space-y-3">
                <Field
                  label="Flyer / Canva / PDF URL"
                  value={quote.flyerUrl ?? ""}
                  onChange={(flyerUrl) => patch({ flyerUrl })}
                  placeholder="https://…"
                />
                <FileUploadField
                  tripId={request.id}
                  kind="flyer"
                  quoteId={quote.id}
                  label="Or upload a flyer / PDF"
                  onUploaded={(flyerUrl) => patch({ flyerUrl })}
                />
              </div>
              <Field
                label="Total shown on the flyer"
                value={quote.investmentTotal}
                onChange={(investmentTotal) => patch({ investmentTotal })}
                placeholder="$0.00"
              />
            </>
          ) : (
            <>
              <PriceSection
                title={packageLabel}
                hint="Property, room, and the package price the traveler will see first."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Property / ship"
                    value={quote.resortName}
                    onChange={(resortName) => patch({ resortName })}
                    placeholder="Hotel, resort, or ship name"
                  />
                  <Field
                    label="Room / cabin"
                    value={quote.roomType}
                    onChange={(roomType) => patch({ roomType })}
                  />
                </div>
                <Field
                  label={`${packageLabel} price`}
                  value={lineAmount(quote.investmentLines, packageLabel)}
                  onChange={(amount) => patchPrice(packageLabel, { amount })}
                  placeholder="$0.00"
                />
                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={Boolean(quote.includesTaxesAndFees)}
                    onChange={(event) =>
                      patch({ includesTaxesAndFees: event.target.checked })
                    }
                    className="h-4 w-4 accent-[var(--gold)]"
                  />
                  Includes taxes & fees
                </label>
                <Field
                  label="Cancellation"
                  value={quote.cancellation}
                  onChange={(cancellation) => patch({ cancellation })}
                />
                <details className="rounded-xl border border-line bg-surface px-3 py-2">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">
                    Optional stay details
                  </summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field
                      label="Nights"
                      value={quote.nights}
                      onChange={(nights) => patch({ nights })}
                    />
                    <Field
                      label="Route"
                      value={quote.route}
                      onChange={(route) => patch({ route })}
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
                  <label className="mt-3 block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">Room details</span>
                    <textarea
                      value={quote.roomDetails}
                      onChange={(event) => patch({ roomDetails: event.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                  <div className="mt-3">
                    <Field
                      label="Photo URL"
                      value={quote.resortImageUrl}
                      onChange={(resortImageUrl) => patch({ resortImageUrl })}
                      placeholder="https://…jpg"
                    />
                    {quote.resortImageUrl.trim() && !photoOk ? (
                      <p className="mt-1 text-xs font-medium text-red-700">
                        That link will not preview. Use a photo URL or leave it blank.
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-3">
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
              </PriceSection>

              <PriceSection title="Flight" hint="Leave blank if this quote is land-only.">
                <Field
                  label="Flight price"
                  value={lineAmount(quote.investmentLines, PRICE_LINE_FLIGHT)}
                  onChange={(amount) => patchPrice(PRICE_LINE_FLIGHT, { amount })}
                  placeholder="$0.00"
                />
                <Field
                  label="Flight notes"
                  value={lineNote(quote.investmentLines, PRICE_LINE_FLIGHT)}
                  onChange={(note) => patchPrice(PRICE_LINE_FLIGHT, { note })}
                  placeholder="Airline, cabin, or route"
                />
              </PriceSection>

              <PriceSection
                title="Transportation"
                hint="Transfers, rental car, or other ground costs."
              >
                <Field
                  label="Transportation price"
                  value={lineAmount(quote.investmentLines, PRICE_LINE_TRANSPORT)}
                  onChange={(amount) => patchPrice(PRICE_LINE_TRANSPORT, { amount })}
                  placeholder="$0.00"
                />
                <Field
                  label="Transportation notes"
                  value={lineNote(quote.investmentLines, PRICE_LINE_TRANSPORT)}
                  onChange={(note) => patchPrice(PRICE_LINE_TRANSPORT, { note })}
                  placeholder="Airport transfer, rental, etc."
                />
              </PriceSection>

              <PriceSection
                title="Special Requests"
                hint="Excursions, celebrations, accessibility, or other extras."
              >
                <Field
                  label="Special requests price"
                  value={lineAmount(quote.investmentLines, PRICE_LINE_SPECIAL)}
                  onChange={(amount) => patchPrice(PRICE_LINE_SPECIAL, { amount })}
                  placeholder="$0.00"
                />
                <Field
                  label="Special requests notes"
                  value={lineNote(quote.investmentLines, PRICE_LINE_SPECIAL)}
                  onChange={(note) => patchPrice(PRICE_LINE_SPECIAL, { note })}
                  placeholder="What this covers"
                />
              </PriceSection>

              <Field
                label="Total (USD, auto)"
                value={quote.investmentTotal}
                onChange={(investmentTotal) => patch({ investmentTotal })}
                readOnly
              />

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
          disabled={saving}
          className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold disabled:opacity-60"
        >
          {saving ? "Sending..." : "Confirm and send"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmBlanks}
        title={`Send with empty ${emptyPriceSections().join(" / ")}?`}
        body="Those lines will be left off the traveler’s quote. Fill them in if this trip includes them."
        confirmLabel="Send anyway"
        onCancel={() => setConfirmBlanks(false)}
        onConfirm={() => {
          setConfirmBlanks(false);
          continueToSend();
        }}
      />

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
