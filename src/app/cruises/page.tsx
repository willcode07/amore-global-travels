import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Cruises",
  description: "Luxurious cruise experiences with shore excursions and onboard comfort.",
};

const activities = [
  { title: "Shore excursion", text: "Explore ports with curated local experiences." },
  { title: "Private tour", text: "Personalized itineraries built around your pace." },
  { title: "Diving", text: "Discover underwater destinations with guided support." },
  { title: "Fishing", text: "Relaxing days on the water with memorable catches." },
  { title: "Events", text: "Celebrate special moments at sea in style." },
];

const steps = [
  "Select yacht",
  "Choose skipper",
  "Make payment",
  "Start sail",
];

export default function CruisesPage() {
  return (
    <>
      <PageHero
        title="Cruises"
        subtitle="Cruise in comfort — a luxurious cruise experience awaits."
        image="/images/travel-1.jpg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="max-w-3xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
            About sailing
          </p>
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Make memories at sea
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Craft unforgettable memories at sea. Immerse yourself in the serenity
            and adventure of oceanic journeys, creating moments that will last a
            lifetime. Relax, unwind, and explore the world in style.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-line bg-surface p-6"
            >
              <h3 className="font-display text-xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-cream p-8 md:p-10">
          <h3 className="font-display text-2xl text-ink">Ready to book</h3>
          <p className="mt-2 text-muted">A very simple way to start your sail.</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li
                key={step}
                className="rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-ink"
              >
                <span className="mr-2 text-gold-deep">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          <Link
            href="/contact-us"
            className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-[#e08c00]"
          >
            Book now
          </Link>
        </div>
      </section>
    </>
  );
}
