"use client";

import Image from "next/image";
import { assetPath } from "@/lib/asset";
import { usablePropertyImage } from "@/lib/quote-media";
import { recommendedFlight } from "@/lib/quotes";
import { site } from "@/lib/site";
import { TravelProposal, TravelRequest } from "@/lib/types";

function TierCard({
  tier,
  recommended,
}: {
  tier: TravelProposal["flightTiers"][number];
  recommended?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border px-4 py-3 ${
        recommended || tier.popular
          ? "border-[#c9a227] bg-[#fff8ea]"
          : "border-[#e4ddd0] bg-white"
      }`}
    >
      {tier.popular ? (
        <div className="absolute -top-2 right-3 rounded-full bg-[#171c19] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f7f3eb]">
          Most popular
        </div>
      ) : null}
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="font-display text-lg text-[#171c19]">{tier.name}</h4>
        <p className="text-sm font-semibold text-[#7a5600]">{tier.price || "—"}</p>
      </div>
      {tier.features.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-[#5e6762]">
          {tier.features.filter(Boolean).map((feature) => (
            <li key={feature}>• {feature}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function QuoteDocument({
  quote,
  request,
}: {
  quote: TravelProposal;
  request: TravelRequest;
}) {
  const flight = recommendedFlight(quote);
  const imageSrc = usablePropertyImage(quote.resortImageUrl);

  return (
    <article className="quote-sheet overflow-hidden rounded-[1.6rem] border border-[#e4ddd0] shadow-[0_18px_50px_rgba(23,28,25,0.08)]">
      <div className="relative isolate min-h-[220px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${assetPath("/images/hero.jpeg")})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#171c19]/70 via-[#171c19]/35 to-[#f7f3eb]" />
        <div className="relative px-6 pb-6 pt-8 md:px-10">
          <div className="flex items-center gap-3">
            <Image
              src={assetPath("/images/logo-alt.png")}
              alt={site.name}
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
            />
            <div>
              <p className="font-display text-lg text-white">{site.name}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#f0c36a]">
                Creating your dream vacation experience
              </p>
            </div>
          </div>
          <h1 className="mt-8 max-w-3xl font-display text-3xl uppercase leading-[1.05] text-white md:text-5xl">
            {quote.occasionTitle}
          </h1>
          <p className="mt-2 font-display text-xl text-white/90 md:text-2xl">
            {quote.destinationLabel}
          </p>
          <div className="mt-5 inline-flex rounded-full bg-[#171c19] px-4 py-2 text-sm font-semibold text-[#f7f3eb]">
            {quote.dates}
            {quote.nights ? `  ·  ${quote.nights}` : ""}
          </div>
          <p className="mt-3 text-sm text-[#171c19]/80">
            {quote.route}
            {quote.route && quote.travelersLabel ? "  ·  " : ""}
            {quote.travelersLabel}
          </p>
        </div>
      </div>

      {quote.flyerUrl ? (
        <div className="px-6 pt-6 md:px-10">
          <a
            href={quote.flyerUrl}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-3xl border border-[#e4ddd0] bg-white"
          >
            {/\.(png|jpe?g|webp|gif)(\?|$)/i.test(quote.flyerUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quote.flyerUrl}
                alt={quote.occasionTitle}
                className="max-h-[420px] w-full object-contain bg-[#f7f3eb]"
              />
            ) : (
              <div className="px-5 py-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5600]">
                  Flyer
                </p>
                <p className="mt-2 font-display text-xl text-[#171c19]">Open Canva / media flyer</p>
                <p className="mt-1 text-sm text-[#5e6762]">{quote.flyerUrl}</p>
              </div>
            )}
          </a>
        </div>
      ) : null}

      <div className="grid gap-6 px-6 py-8 md:grid-cols-2 md:px-10">
        <div className="space-y-5">
          <section className="rounded-3xl bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5600]">
              Vacation investment
            </p>
            <div className="mt-4 space-y-2 text-sm">
              {quote.investmentLines
                .filter((line) => line.label.trim())
                .map((line) => (
                  <div key={line.label} className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[#171c19]">{line.label}</div>
                      {line.note ? (
                        <div className="text-xs text-[#5e6762]">{line.note}</div>
                      ) : null}
                    </div>
                    <div className="font-medium text-[#171c19]">{line.amount || "—"}</div>
                  </div>
                ))}
            </div>
            <div className="mt-4 rounded-2xl bg-[#171c19] px-4 py-3 text-white">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[#f0c36a]">
                Total stay cost
              </div>
              <div className="font-display text-3xl">
                {quote.investmentTotal || "Quoted on request"}
              </div>
            </div>
            {quote.cancellation ? (
              <p className="mt-3 text-xs text-[#5e6762]">
                Cancellation: {quote.cancellation}
              </p>
            ) : null}
          </section>

          {quote.includeFlights ? (
            <section className="rounded-3xl bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5600]">
                Flight options
              </p>
              {quote.flightRoute ? (
                <p className="mt-1 text-sm text-[#5e6762]">{quote.flightRoute}</p>
              ) : null}
              <div className="mt-4 space-y-3">
                {quote.flightTiers
                  .filter((tier) => tier.name.trim())
                  .map((tier) => (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      recommended={tier.id === quote.recommendedFlightId}
                    />
                  ))}
              </div>
              {flight ? (
                <div className="mt-4 rounded-2xl bg-[#171c19] px-4 py-3 text-sm text-white">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[#f0c36a]">
                    Recommended for this party
                  </div>
                  <div className="mt-1 font-display text-xl">{flight.name}</div>
                  <p className="text-[#f7f3eb]/80">
                    {quote.recommendedFlightTotal || flight.price} for{" "}
                    {quote.travelersLabel || request.trip.travelers + " travelers"}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-3xl bg-white">
            <div className="bg-[#c9a227] px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#171c19]">
                Your stay
              </p>
              <h3 className="font-display text-2xl text-[#171c19]">
                {quote.resortName || "Resort details coming next"}
              </h3>
              <p className="text-xs text-[#171c19]/80">
                {quote.resortRating ? `${quote.resortRating}★  ·  ` : ""}
                {quote.resortAddress}
              </p>
            </div>
            <div className="relative h-44 bg-[#f7f3eb]">
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt={quote.resortName || "Property"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[#5e6762]">
                  No property photo
                </div>
              )}
            </div>
            <div className="p-5">
              <h4 className="font-display text-lg text-[#171c19]">
                {quote.roomType || "Room type to be confirmed"}
              </h4>
              {quote.roomDetails ? (
                <p className="mt-1 text-sm text-[#5e6762]">{quote.roomDetails}</p>
              ) : null}
              {quote.amenities.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {quote.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="rounded-full bg-[#f7f3eb] px-3 py-1.5 text-xs font-medium text-[#171c19]"
                    >
                      {amenity}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {quote.enhancements.some((item) => item.name.trim()) ? (
            <section className="rounded-3xl bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5600]">
                Optional enhancements
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {quote.enhancements
                  .filter((item) => item.name.trim())
                  .map((item) => (
                    <li key={item.name} className="flex justify-between gap-3">
                      <span>
                        {item.name}
                        {item.note ? (
                          <span className="block text-xs text-[#5e6762]">{item.note}</span>
                        ) : null}
                      </span>
                      <span className="font-medium">{item.price || "—"}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          {quote.includeProtection ? (
            <section className="rounded-3xl bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5600]">
                Travel protection
              </p>
              <p className="mt-1 text-sm text-[#5e6762]">
                {quote.protectionProvider || "Coverage options"}
              </p>
              <div className="mt-4 space-y-3">
                {quote.protectionTiers
                  .filter((tier) => tier.name.trim())
                  .map((tier) => (
                    <TierCard key={tier.id} tier={tier} />
                  ))}
              </div>
              {quote.protectionUpgrade ? (
                <p className="mt-3 text-xs text-[#5e6762]">{quote.protectionUpgrade}</p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      {quote.notes.filter(Boolean).length > 0 ? (
        <div className="grid gap-4 px-6 pb-6 md:grid-cols-2 md:px-10">
          {quote.notes.filter(Boolean).map((note) => (
            <p
              key={note}
              className="rounded-2xl border border-[#e4ddd0] bg-white px-4 py-3 text-xs leading-relaxed text-[#5e6762]"
            >
              {note}
            </p>
          ))}
        </div>
      ) : null}

      <div className="bg-[#171c19] px-6 py-5 text-center md:px-10">
        <p className="font-display text-lg text-[#f7f3eb] md:text-xl">
          {quote.thankYou}
        </p>
        <p className="mt-2 text-xs text-[#f0c36a]">
          {site.phone}  ·  {site.email}  ·  Trip {request.tripRef}
        </p>
      </div>
    </article>
  );
}
