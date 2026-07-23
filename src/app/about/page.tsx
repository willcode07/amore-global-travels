import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { assetPath } from "@/lib/asset";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${site.name} — experienced agents for cruises, vacations, and trip protection.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="About Us"
        subtitle="Let our travel agency be your guide."
        image="/images/about.jpeg"
      />

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div className="relative min-h-[360px] overflow-hidden rounded-3xl">
          <Image
            src={assetPath("/images/about.jpeg")}
            alt="Travelers exploring the world"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Travel adventure with trip protection
          </h2>
          <p className="mt-4 text-muted leading-relaxed">
            We are a travel adventure company helping you leave footprints in
            every corner. Tour amazing places around the world with experienced
            agents and packages built around comfort, safety, and value.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink">
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-gold" />
              Safety-first planning for every itinerary
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-gold" />
              Competitive pricing with concierge support
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-gold" />
              Cruises, vacations, transfers &amp; insurance
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <StartTravelButton className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink">
              Fillable Form
            </StartTravelButton>
            <Link
              href="/contact-us"
              className="rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
