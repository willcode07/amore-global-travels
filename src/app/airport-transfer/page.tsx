import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Airport Transfer",
  description: "VIP airport transfers with luxury cars and professional drivers.",
};

const perks = [
  "Incredible comfort on every trip",
  "Luxury limousine selection",
  "24/7 order availability",
  "Fast car delivery service",
  "High safety and cleanliness",
  "Fixed price & bonus system",
  "Professional car drivers",
];

export default function AirportTransferPage() {
  return (
    <>
      <PageHero
        title="Airport Transfer"
        subtitle="VIP transfer — enjoy the ride. Luxury cars for maximum satisfaction."
        image="/images/travel-2.jpg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-ink">
              To the airport with maximum comfort
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Travel to the airport in sheer comfort and style. Our services
              guarantee a smooth, luxurious journey, ensuring you arrive relaxed
              and on time. We value the time and quality of travel for each of
              our clients.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Experience ultimate satisfaction with our premium fleet — comfort,
              elegance, and reliability from curb to terminal.
            </p>
            <Link
              href="/contact-us"
              className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-[#e08c00]"
            >
              Book now
            </Link>
          </div>
          <ul className="space-y-3 rounded-3xl bg-cream p-8">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-ink">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 rounded-3xl border border-line bg-surface p-8 text-center md:p-10">
          <p className="font-display text-2xl text-ink">
            Get a client club card and enjoy 15% off your next trips
          </p>
          <p className="mt-2 text-muted">
            Call{" "}
            <a href={site.phoneHref} className="font-semibold text-gold-deep">
              {site.phone}
            </a>{" "}
            or email{" "}
            <a href={`mailto:${site.email}`} className="font-semibold text-gold-deep">
              {site.email}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
