import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { assetPath } from "@/lib/asset";
import { brand } from "@/lib/brand";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Brand Book",
  description: `${site.name} brand identity guidelines for UAT review.`,
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "Sand", hex: brand.colors.sand, note: "Page background" },
  { name: "Cream", hex: brand.colors.cream, note: "Soft section bands" },
  { name: "Ivory", hex: brand.colors.ivory, note: "Surfaces & forms" },
  { name: "Ink", hex: brand.colors.ink, note: "Headlines & body" },
  { name: "Muted", hex: brand.colors.muted, note: "Supporting text" },
  { name: "Line", hex: brand.colors.line, note: "Borders" },
  { name: "Gold", hex: brand.colors.gold, note: "Primary actions" },
  { name: "Bronze", hex: brand.colors.bronze, note: "Labels & links" },
];

export default function BrandPage() {
  return (
    <>
      <PageHero
        title="Brand Book"
        subtitle="Simple guidelines so Amore looks and feels the same everywhere."
        image="/images/about.jpeg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="mb-6 inline-flex rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold-deep">
          UAT review · v1.1
        </div>
        <h2 className="font-display text-3xl text-ink md:text-4xl">
          {brand.fullName}
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          {brand.promise}
        </p>
        <p className="mt-4 max-w-2xl text-sm text-muted">
          Full written guide:{" "}
          <code className="rounded bg-cream px-1.5 py-0.5 text-ink">
            docs/BRAND_BOOK.md
          </code>
        </p>

        <div className="mt-14 grid gap-10 md:grid-cols-[200px_1fr] md:items-center">
          <div className="flex items-center justify-center rounded-[1.4rem] bg-brand p-8">
            <Image
              src={assetPath("/images/logo-alt.png")}
              alt={`${site.name} logo on dark`}
              width={140}
              height={140}
              className="h-28 w-28 object-contain"
            />
          </div>
          <div>
            <h3 className="font-display text-2xl text-ink">Logo</h3>
            <p className="mt-2 text-muted">
              Heart globe + Amore Global wordmark. Use the light logo on cream
              and the alt logo on ink. Keep clear space around the mark and never
              stretch it.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="rounded-2xl border border-line bg-surface px-6 py-5">
                <Image
                  src={assetPath("/images/logo.png")}
                  alt="Logo on light"
                  width={72}
                  height={72}
                  className="mx-auto h-16 w-16 object-contain"
                />
                <p className="mt-3 text-center text-xs text-muted">On sand / cream</p>
              </div>
              <div className="rounded-2xl bg-brand px-6 py-5">
                <Image
                  src={assetPath("/images/logo-alt.png")}
                  alt="Logo on dark"
                  width={72}
                  height={72}
                  className="mx-auto h-16 w-16 object-contain"
                />
                <p className="mt-3 text-center text-xs text-cream/70">On ink</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h3 className="font-display text-2xl text-ink">Color</h3>
          <p className="mt-2 max-w-2xl text-muted">
            Warm cream and gold. One gold action per section keeps the brand calm
            and premium.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {swatches.map((swatch) => (
              <div
                key={swatch.name}
                className="overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <div
                  className="h-24 border-b border-line"
                  style={{ background: swatch.hex }}
                />
                <div className="p-4">
                  <div className="font-semibold text-ink">{swatch.name}</div>
                  <div className="mt-1 font-mono text-xs text-muted">{swatch.hex}</div>
                  <div className="mt-2 text-xs text-muted">{swatch.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="font-display text-2xl text-ink">Typography</h3>
            <div className="mt-6 space-y-6 rounded-[1.4rem] border border-line bg-surface p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                  Display · {brand.type.display}
                </p>
                <p className="mt-2 font-display text-3xl text-ink">
                  Travel with heart
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                  Body · {brand.type.body}
                </p>
                <p className="mt-2 text-muted leading-relaxed">
                  Clear, friendly sentences for travelers and agents. Easy to
                  read on phones and desktops.
                </p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-display text-2xl text-ink">Buttons</h3>
            <div className="mt-6 space-y-4 rounded-[1.4rem] border border-line bg-cream p-6">
              <button
                type="button"
                className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-brand"
              >
                Primary · Gold
              </button>
              <div>
                <button
                  type="button"
                  className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink"
                >
                  Secondary · Outline
                </button>
              </div>
              <p className="text-sm text-muted">
                Pill shape. Soft hover. Never stack many competing gold buttons
                in one view.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-[1.4rem] border border-line bg-surface p-6 md:p-8">
          <h3 className="font-display text-2xl text-ink">Favicon &amp; color modes</h3>
          <p className="mt-2 max-w-2xl text-muted">
            The tab icon is the gold heart only — no underline. Light and dark
            follow the visitor&apos;s browser theme, and the header toggle lets
            them switch. The footer stays ink so the logo remains readable.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand">
              <Image
                src={assetPath("/favicon.svg")}
                alt="Favicon"
                width={40}
                height={40}
                className="h-10 w-10"
              />
            </div>
            <p className="text-sm text-muted">
              Heart globe, gold gradient, continents suggested with quiet strokes.
            </p>
          </div>
        </div>

        <div className="mt-16 rounded-[1.4rem] bg-brand px-6 py-8 text-cream md:px-10">
          <h3 className="font-display text-2xl">Contact standards</h3>
          <ul className="mt-4 space-y-2 text-sm text-cream/80">
            <li>{brand.contact.email}</li>
            <li>{brand.contact.phone}</li>
            <li>{brand.contact.address}</li>
          </ul>
          <Link
            href="/contact-us"
            className="mt-6 inline-flex rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-brand"
          >
            View Contact Us
          </Link>
        </div>
      </section>
    </>
  );
}
