import type { Metadata } from "next";
import Link from "next/link";
import { ClientIntakeForms } from "@/components/ClientIntakeForms";
import { PageHero } from "@/components/PageHero";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Contact ${site.name} in Fayetteville, GA.`,
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact Us"
        subtitle="We treat our travelers like valued family members."
        image="/images/hero.jpeg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="mb-10 rounded-3xl bg-cream p-8 md:p-10">
          <h2 className="font-display text-3xl text-ink">Book your travel here</h2>
          <p className="mt-3 max-w-2xl text-muted">
            Use Contact Us for general questions, or Request a Quote for trip
            planning. Both generate a PDF for {site.email}.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <StartTravelButton className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink">
              Fillable Form
            </StartTravelButton>
            <Link
              href="/connect-stripe"
              className="rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink"
            >
              Connect Stripe Account
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink"
            >
              Open my trip dashboard
            </Link>
          </div>
        </div>

        <div className="mb-10 grid gap-8 md:grid-cols-3">
          <div className="rounded-3xl border border-line bg-surface p-7">
            <h2 className="font-display text-xl text-ink">Office</h2>
            <p className="mt-3 text-muted">{site.address}</p>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-7">
            <h2 className="font-display text-xl text-ink">Email</h2>
            <a
              href={`mailto:${site.email}`}
              className="mt-3 inline-block text-gold-deep transition hover:underline"
            >
              {site.email}
            </a>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-7">
            <h2 className="font-display text-xl text-ink">Call us</h2>
            <a
              href={site.phoneHref}
              className="mt-3 inline-block text-gold-deep transition hover:underline"
            >
              {site.phone}
            </a>
          </div>
        </div>

        <ClientIntakeForms />
      </section>
    </>
  );
}
