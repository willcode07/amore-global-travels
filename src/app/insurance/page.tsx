import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Insurance",
  description: "Travel insurance that protects your tour and keeps journeys memorable.",
};

const offerings = [
  {
    title: "Easy system & trusted",
    text: "Save money with a straightforward process and trusted coverage options.",
  },
  {
    title: "Dedicated support",
    text: "A customer support team ready to help before, during, and after travel.",
  },
  {
    title: "Corporate & professional",
    text: "Coverage options for individuals and professional travel needs.",
  },
];

const reasons = [
  "Knowledgeable consulting",
  "Best rates and coverage",
  "Insurance based on travel",
  "Global well-known reputations",
  "Professional & dedicated team",
];

export default function InsurancePage() {
  return (
    <>
      <PageHero
        title="Insurance"
        subtitle="We protect & make your tour memorable."
        image="/images/about.jpeg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Our mission: serve you better
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Elevating your experience through dedicated service. Discover how we
            strive to exceed expectations every step of the way with travel
            insurance built for peace of mind.
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

        <div className="mt-16 grid gap-10 rounded-3xl bg-cream p-8 md:grid-cols-2 md:p-10">
          <div>
            <h3 className="font-display text-2xl text-ink">
              Why people choose our insurance
            </h3>
            <ul className="mt-6 space-y-3">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-3 text-ink">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-muted leading-relaxed">
              Learn insurance solutions with our professionals. Consultations are
              available to help you choose coverage that fits your itinerary.
            </p>
            <Link
              href="/contact-us"
              className="mt-6 inline-flex w-fit rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-[#e08c00]"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
