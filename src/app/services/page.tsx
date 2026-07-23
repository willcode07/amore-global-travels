import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { services, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description: `Explore ${site.name} services — cruises, vacation packages, and travel insurance.`,
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        title="Services"
        subtitle="Cruises, vacation packages, and trip protection — planned with care."
        image="/images/travel-1.jpg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            What we offer
          </h2>
          <p className="mt-3 text-muted">
            We&apos;re here for you from start to finish — under one roof.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="group overflow-hidden rounded-2xl bg-surface shadow-[0_12px_40px_rgba(28,35,31,0.08)] transition hover:-translate-y-1"
            >
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="font-display text-xl text-ink">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {service.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-cream p-8 md:p-10">
          <h3 className="font-display text-2xl text-ink">Ready to book?</h3>
          <p className="mt-2 max-w-xl text-muted">
            Use the fillable form to share your trip details and we&apos;ll
            follow up with options.
          </p>
          <StartTravelButton className="mt-6 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink">
            Fillable Form
          </StartTravelButton>
        </div>
      </section>
    </>
  );
}
