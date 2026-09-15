"use client";

import { useEffect } from "react";
import { PageHero } from "@/components/PageHero";
import { StartTravelButton, useRequestModal } from "@/components/RequestModalProvider";
import { site } from "@/lib/site";

export default function RequestAQuotePage() {
  const { openModal } = useRequestModal();

  useEffect(() => {
    const timer = window.setTimeout(() => openModal(), 300);
    return () => window.clearTimeout(timer);
  }, [openModal]);

  return (
    <>
      <PageHero
        title="Request a Quote"
        subtitle="Share your trip details and we'll research options for your dashboard."
        image="/images/hero.jpeg"
      />

      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <div className="rounded-3xl bg-cream p-8 text-center md:p-10">
          <h2 className="font-display text-3xl text-ink">Request your trip</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Start with a short quote request. Then open your dashboard and complete
            the full trip details form so your agent can write a quote.
          </p>
          <StartTravelButton className="mt-8 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-on-gold">
            Request a Quote
          </StartTravelButton>
          <p className="mt-4 text-xs text-muted">
            Questions? Email{" "}
            <a href={`mailto:${site.email}`} className="text-gold-deep underline">
              {site.email}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
