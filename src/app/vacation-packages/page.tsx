import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/PageHero";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { vacationRegions } from "@/lib/destinations";

export const metadata: Metadata = {
  title: "Vacation Packages",
  description:
    "Africa, Caribbean, and Europe vacation inspiration — then a custom quote from an Amore Global agent.",
};

export default function VacationPackagesPage() {
  return (
    <>
      <PageHero
        title="Vacation Packages"
        subtitle="Regions we plan often. Details and pricing live in your quote — not on a page that goes stale."
        image="/images/caribbean.jpeg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Browse by region, then talk to us
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            These are starting points — Jamaica under the Caribbean, Ghana and Kenya
            in Africa, London and Greece in Europe. When a destination catches your
            eye, ask for pricing and an agent will write one for your dates and your group.
          </p>
        </div>

        <div className="mt-12 space-y-12">
          {vacationRegions.map((region) => (
            <article
              key={region.slug}
              className="grid items-center gap-8 overflow-hidden rounded-[1.6rem] border border-line bg-surface md:grid-cols-2"
            >
              <div className="relative min-h-[260px]">
                <Image
                  src={region.image}
                  alt={region.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                  {region.eyebrow}
                </p>
                <h3 className="mt-2 font-display text-3xl text-ink">{region.name}</h3>
                <p className="mt-3 text-muted">{region.summary}</p>
                <p className="mt-3 text-sm font-medium text-ink">
                  Curious what it costs? Ask — we’ll price it for your party.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {region.destinations.map((place) => (
                    <StartTravelButton
                      key={place}
                      destination={place}
                      tripType="vacation_package"
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold"
                    >
                      Ask about {place}
                    </StartTravelButton>
                  ))}
                </div>
                <StartTravelButton
                  destination={region.name}
                  tripType="vacation_package"
                  className="mt-6 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold"
                >
                  Ask for {region.name} pricing
                </StartTravelButton>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
