import type { Metadata } from "next";
import Link from "next/link";
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
            The fastest way to start is the travel request form. Share where you
            want to go, and we&apos;ll research options and post them to your
            personal trip dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <StartTravelButton className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink">
              Start your travel request
            </StartTravelButton>
            <Link
              href="/dashboard"
              className="rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink"
            >
              Open my trip dashboard
            </Link>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
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

        <form className="mt-12 grid max-w-3xl gap-4 rounded-3xl bg-cream p-8 md:p-10">
          <h2 className="font-display text-2xl text-ink">Drop a line</h2>
          <p className="text-sm text-muted">
            Prefer a quick note first? Send a message and we&apos;ll get back to
            you shortly — or use the travel request form for trip planning.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              name="name"
              placeholder="Your name"
              className="rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
            />
            <input
              type="email"
              name="email"
              placeholder="Email address"
              className="rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
            />
          </div>
          <input
            type="text"
            name="subject"
            placeholder="Subject"
            className="rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
          />
          <textarea
            name="message"
            rows={5}
            placeholder="Your message"
            className="rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
          />
          <button
            type="button"
            className="w-fit rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-[#e08c00]"
          >
            Send message
          </button>
          <p className="text-xs text-muted">
            General contact form is front-end only for now — email us directly at{" "}
            {site.email}.
          </p>
        </form>
      </section>
    </>
  );
}
