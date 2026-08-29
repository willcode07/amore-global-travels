"use client";

import { FormEvent, useMemo, useState } from "react";
import { FileUploadField } from "@/components/FileUploadField";
import { QuoteDocument } from "@/components/QuoteDocument";
import { amenityPresets, emptyProposal, sampleProposal } from "@/lib/quotes";
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2"
      />
    </label>
  );
}

function updateTier(tiers: QuoteTier[], id: string, patch: Partial<QuoteTier>) {
  return tiers.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier));
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
  const [showPreview, setShowPreview] = useState(false);

  const recommendedName = useMemo(
    () => quote.flightTiers.find((tier) => tier.id === quote.recommendedFlightId)?.name,
    [quote.flightTiers, quote.recommendedFlightId],
  );

  function patch(next: Partial<TravelProposal>) {
    setQuote((current) => ({ ...current, ...next }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onPublish(quote);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-ink">Build a written quote</h3>
          <p className="mt-1 text-sm text-muted">
            Same structure as a luxury proposal — stay, flights, protection, and add-ons
            in one document the traveler can review and print.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setQuote(sampleProposal(request))}
          className="text-sm font-semibold text-gold-deep"
        >
          Load sample layout
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Occasion / headline"
          value={quote.occasionTitle}
          onChange={(occasionTitle) => patch({ occasionTitle })}
        />
        <Field
          label="Destination line"
          value={quote.destinationLabel}
          onChange={(destinationLabel) => patch({ destinationLabel })}
        />
        <Field label="Dates" value={quote.dates} onChange={(dates) => patch({ dates })} />
        <Field label="Nights" value={quote.nights} onChange={(nights) => patch({ nights })} />
        <Field
          label="Travelers"
          value={quote.travelersLabel}
          onChange={(travelersLabel) => patch({ travelersLabel })}
        />
        <Field label="Route" value={quote.route} onChange={(route) => patch({ route })} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Resort / ship"
          value={quote.resortName}
          onChange={(resortName) => patch({ resortName })}
        />
        <Field
          label="Rating"
          value={quote.resortRating}
          onChange={(resortRating) => patch({ resortRating })}
        />
        <Field
          label="Address"
          value={quote.resortAddress}
          onChange={(resortAddress) => patch({ resortAddress })}
        />
        <Field
          label="Room / cabin"
          value={quote.roomType}
          onChange={(roomType) => patch({ roomType })}
        />
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink">Room details</span>
        <textarea
          value={quote.roomDetails}
          onChange={(event) => patch({ roomDetails: event.target.value })}
          rows={2}
          className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2"
        />
      </label>
      <Field
        label="Photo URL (optional)"
        value={quote.resortImageUrl}
        onChange={(resortImageUrl) => patch({ resortImageUrl })}
        placeholder="https://…"
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
                  active ? "bg-gold text-brand" : "border border-line bg-surface text-muted"
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
            <div key={`${line.label}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_140px]">
              <input
                value={line.label}
                onChange={(event) => {
                  const investmentLines: QuoteLine[] = quote.investmentLines.map((item, i) =>
                    i === index ? { ...item, label: event.target.value } : item,
                  );
                  patch({ investmentLines });
                }}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
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
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label="Stay total"
            value={quote.investmentTotal}
            onChange={(investmentTotal) => patch({ investmentTotal })}
          />
          <Field
            label="Cancellation"
            value={quote.cancellation}
            onChange={(cancellation) => patch({ cancellation })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={quote.includeFlights}
          onChange={(event) => patch({ includeFlights: event.target.checked })}
        />
        Include flight options
      </label>
      {quote.includeFlights ? (
        <div className="space-y-3 rounded-2xl bg-cream p-4">
          <Field
            label="Flight route"
            value={quote.flightRoute}
            onChange={(flightRoute) => patch({ flightRoute })}
          />
          {quote.flightTiers.map((tier) => (
            <div key={tier.id} className="grid gap-2 rounded-xl bg-surface p-3 md:grid-cols-2">
              <input
                value={tier.name}
                onChange={(event) =>
                  patch({ flightTiers: updateTier(quote.flightTiers, tier.id, { name: event.target.value }) })
                }
                placeholder="Tier name"
                className="rounded-xl border border-line px-3 py-2 text-sm"
              />
              <input
                value={tier.price}
                onChange={(event) =>
                  patch({
                    flightTiers: updateTier(quote.flightTiers, tier.id, { price: event.target.value }),
                  })
                }
                placeholder="Price"
                className="rounded-xl border border-line px-3 py-2 text-sm"
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
                className="rounded-xl border border-line px-3 py-2 text-sm md:col-span-2"
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
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Recommended tier</span>
              <select
                value={quote.recommendedFlightId}
                onChange={(event) => patch({ recommendedFlightId: event.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2"
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
              label={`Recommended total${recommendedName ? ` (${recommendedName})` : ""}`}
              value={quote.recommendedFlightTotal}
              onChange={(recommendedFlightTotal) => patch({ recommendedFlightTotal })}
            />
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium text-ink">Enhancements</p>
        {quote.enhancements.map((item, index) => (
          <div key={`${item.name}-${index}`} className="mb-2 grid gap-2 md:grid-cols-3">
            <input
              value={item.name}
              onChange={(event) => {
                const enhancements: QuoteEnhancement[] = quote.enhancements.map((row, i) =>
                  i === index ? { ...row, name: event.target.value } : row,
                );
                patch({ enhancements });
              }}
              placeholder="Add-on"
              className="rounded-xl border border-line px-3 py-2 text-sm"
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
              className="rounded-xl border border-line px-3 py-2 text-sm"
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
              className="rounded-xl border border-line px-3 py-2 text-sm"
            />
          </div>
        ))}
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
                className="rounded-xl border border-line px-3 py-2 text-sm"
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
                className="rounded-xl border border-line px-3 py-2 text-sm"
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
                className="rounded-xl border border-line px-3 py-2 text-sm md:col-span-2"
              />
            </div>
          ))}
          <Field
            label="Optional upgrade line"
            value={quote.protectionUpgrade}
            onChange={(protectionUpgrade) => patch({ protectionUpgrade })}
          />
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink">Notes (one per box)</span>
        <textarea
          value={quote.notes.join("\n")}
          onChange={(event) => patch({ notes: event.target.value.split("\n") })}
          rows={3}
          className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 outline-none ring-gold focus:ring-2"
        />
      </label>
      <Field
        label="Closing thank-you"
        value={quote.thankYou}
        onChange={(thankYou) => patch({ thankYou })}
      />
      <Field
        label="Canva / flyer URL (optional)"
        value={quote.flyerUrl ?? ""}
        onChange={(flyerUrl) => patch({ flyerUrl })}
      />
      <FileUploadField
        tripId={request.id}
        kind="flyer"
        quoteId={quote.id}
        label="Or upload a flyer / PDF"
        onUploaded={(flyerUrl) => patch({ flyerUrl })}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowPreview((value) => !value)}
          className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
        >
          {showPreview ? "Hide preview" : "Preview quote"}
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
          className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-brand disabled:opacity-60"
        >
          {saving ? "Publishing..." : "Publish quote to traveler"}
        </button>
      </div>

      {showPreview ? <QuoteDocument quote={quote} request={request} /> : null}
    </form>
  );
}

export function newTier(): QuoteTier {
  return { id: createId("tier"), name: "", price: "", features: [] };
}
