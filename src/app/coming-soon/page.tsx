import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { assetPath } from "@/lib/asset";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Coming soon",
  description: "A new Amore Global site is on the way. Call or email and an agent will still plan the trip.",
};

export default function ComingSoonPage() {
  return (
    <section className="relative isolate flex min-h-screen flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center amore-hero-zoom"
        style={{ backgroundImage: `url(${assetPath("/images/hero.jpeg")})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/80" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16 text-white md:px-8">
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo size={56} invert />
          <div>
            <p className="font-display text-2xl leading-none">{site.name}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Travels
            </p>
          </div>
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">
          Coming soon
        </p>
        <h1 className="mt-3 max-w-xl font-display text-5xl leading-[0.98] md:text-6xl">
          Cruises and vacations, planned with care
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/85">
          A new site is on the way. Until it opens, call or email and an agent
          will plan the trip with you.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={site.phoneHref}
            className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-on-gold transition hover:brightness-95"
          >
            {site.phone}
          </a>
          <a
            href={`mailto:${site.email}`}
            className="rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            {site.email}
          </a>
        </div>

        <p className="mt-10 text-sm text-white/70">{site.address}</p>
      </div>
    </section>
  );
}
