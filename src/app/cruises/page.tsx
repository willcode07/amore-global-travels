import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { StartTravelButton } from "@/components/RequestModalProvider";

export const metadata: Metadata = {
  title: "Cruises",
  description:
    "Group and private cruise planning with an Amore Global agent — kept separate from land vacations.",
};

const highlights = [
  {
    title: "Group sailings",
    text: "Cabin blocks and hosted groups, planned so everyone knows where to be.",
  },
  {
    title: "Private cruise planning",
    text: "A sailing chosen for your dates, ports, and how you like to travel.",
  },
  {
    title: "Shore days that fit",
    text: "Excursions and independent time, not a one-size tour list.",
  },
  {
    title: "Celebrations at sea",
    text: "Birthdays, reunions, and milestone trips with the details written into the quote.",
  },
];

export default function CruisesPage() {
  return (
    <>
      <PageHero
        title="Cruises"
        subtitle="A cruise is its own kind of trip. We keep it separate from land packages so you can find it on purpose."
        image="/images/travel-1.jpg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="max-w-3xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
            At sea
          </p>
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Tell us the sailing. We build the quote.
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            No sticker prices and no checkout. Tell us the sailing you have in mind
            and an agent will come back with a price built for your dates and your group.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-display text-xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-cream p-8 md:p-10">
          <h3 className="font-display text-2xl text-ink">Ready to look at a cruise?</h3>
          <p className="mt-2 max-w-xl text-muted">
            Share a region, a month, and who is sailing. Caribbean itineraries and
            other popular routes are planned the same way: quote first, book when
            you are sure.
          </p>
          <StartTravelButton
            tripType="cruise"
            destination="Cruise"
            className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-on-gold"
          >
            Ask for cruise pricing
          </StartTravelButton>
        </div>
      </section>
    </>
  );
}
