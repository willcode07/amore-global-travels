import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/PageHero";
import { advisories, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Updates & Advisories",
  description: `Travel updates and advisories from ${site.name}.`,
};

export default function UpdatesPage() {
  return (
    <>
      <PageHero
        title="Updates & Advisories"
        subtitle="Amazing news & notes for every update on the road ahead."
        image="/images/caribbean.jpeg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {advisories.map((item) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <div className="relative h-44">
                <Image src={item.image} alt={item.title} fill className="object-cover" />
              </div>
              <div className="p-5">
                <h2 className="font-display text-lg text-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
