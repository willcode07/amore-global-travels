import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Vacation Packages",
  description: "Tailored vacation packages for memorable getaways around the world.",
};

const stats = [
  { value: "752", label: "Customers" },
  { value: "603", label: "Trips" },
  { value: "52", label: "Trip types" },
  { value: "108", label: "Adventure activities" },
];

const packages = [
  {
    name: "Regular Package",
    price: "From $19.85",
    features: ["Best price", "Book online", "Travel concierge", "Airport lounge voucher"],
  },
  {
    name: "Standard Package",
    price: "From $19.85",
    features: ["Best price", "Book online", "Travel concierge", "Luxury transfer"],
  },
  {
    name: "Premium Package",
    price: "From $19.85",
    features: ["Best price", "Book online", "Luxury transfer", "Airport lounge voucher"],
  },
];

export default function VacationPackagesPage() {
  return (
    <>
      <PageHero
        title="Vacation Packages"
        subtitle="Tailored vacation packages — your gateway to memorable getaways."
        image="/images/caribbean.jpeg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-ink md:text-4xl">
              Travel to make memories all around the world
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Escape to paradise with unbeatable vacation packages designed for
              comfort, adventure, and ease — from planning to return home.
            </p>
          </div>
          <div className="relative min-h-[280px] overflow-hidden rounded-3xl">
            <Image
              src="/images/travel-1.jpg"
              alt="Vacation destination"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-line bg-surface px-4 py-6 text-center"
            >
              <div className="font-display text-3xl text-gold-deep">{stat.value}</div>
              <div className="mt-1 text-sm text-muted">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h3 className="font-display text-2xl text-ink md:text-3xl">
            Amazing vacation pricing
          </h3>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className="flex flex-col rounded-3xl border border-line bg-cream p-6"
              >
                <h4 className="font-display text-xl text-ink">{pkg.name}</h4>
                <p className="mt-2 text-sm font-semibold text-gold-deep">{pkg.price}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
                  {pkg.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <Link
                  href="/contact-us"
                  className="mt-6 inline-flex justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream transition hover:bg-black"
                >
                  Choose package
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
