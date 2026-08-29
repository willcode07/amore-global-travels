import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/PageHero";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { assetPath } from "@/lib/asset";
import { aura } from "@/lib/destinations";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Enhance your trip",
  description: `Keep vacation photos moving with an Aura frame — an Amore Global add-on.`,
};

const beats = [
  "Buy the frame through our partnership when it is live — for now, see how Aura works and ask us to include it on your quote.",
  "Everyone on the trip can send photos into the same frame. No chasing a shared album.",
  "Aura handles setup. We handle putting it on the proposal so it is part of the trip, not an afterthought.",
];

export default function EnhancePage() {
  return (
    <>
      <PageHero
        title="Enhance your trip"
        subtitle="The photos should live somewhere better than a camera roll."
        image="/images/travel-2.jpg"
      />

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
            {aura.name}
          </p>
          <h2 className="mt-2 font-display text-3xl text-ink md:text-4xl">
            {aura.headline}
          </h2>
          <p className="mt-4 leading-relaxed text-muted">{aura.summary}</p>
          <ul className="mt-6 space-y-3 text-sm text-ink">
            {beats.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={aura.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-on-gold"
            >
              Visit Aura Frames
            </a>
            <StartTravelButton className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold">
              Ask for it on my quote
            </StartTravelButton>
          </div>
          <p className="mt-4 text-xs text-muted">
            Affiliate code will be added once the partnership agreement is in place.
            Until then, mention Aura on your request or we will include it as an
            optional line on the proposal. Questions: {site.email}.
          </p>
        </div>
        <div className="relative min-h-[380px] overflow-hidden rounded-[1.6rem]">
          <Image
            src={assetPath("/images/travel-2.jpg")}
            alt="A trip worth keeping on the wall"
            fill
            className="object-cover"
          />
        </div>
      </section>
    </>
  );
}
