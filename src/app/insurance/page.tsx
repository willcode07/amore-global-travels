import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { StartTravelButton } from "@/components/RequestModalProvider";

export const metadata: Metadata = {
  title: "Insurance",
  description: "Travel insurance that protects your tour and keeps journeys memorable.",
};

const offerings = [
  {
    title: "Quoted with the trip",
    text: "Protection sits on the same proposal as the stay and flights, so you can see the whole investment.",
  },
  {
    title: "Someone to call",
    text: "Support before, during, and after travel — not a policy PDF left in your inbox.",
  },
  {
    title: "Fit to the itinerary",
    text: "Cruise, all-inclusive, or a multi-city Europe trip: coverage follows how you actually travel.",
  },
];

export default function InsurancePage() {
  return (
    <>
      <PageHero
        title="Insurance"
        subtitle="We protect the trip you just got excited about."
        image="/images/about.jpeg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Trip protection, on the quote
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Travel insurance is part of how we plan — not a separate shopping
            errand. Ask for it on your request, or we will include typical Allianz
            options on the written proposal so you can choose a tier.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {offerings.map((item) => (
            <div key={item.title} className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-display text-xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-cream p-8 md:p-10">
          <h3 className="font-display text-2xl text-ink">Add protection to a quote</h3>
          <p className="mt-2 max-w-xl text-muted">
            Request a trip and mention coverage, or we will include it as an
            optional section on your proposal.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <StartTravelButton className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-on-gold">
              Request a Quote
            </StartTravelButton>
            <Link
              href="/contact-us"
              className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
