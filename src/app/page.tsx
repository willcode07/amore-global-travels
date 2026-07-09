import Image from "next/image";
import Link from "next/link";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { services, site } from "@/lib/site";

const guarantees = [
  {
    title: "Safety first",
    text: "Embrace safety — it's our top priority, always.",
  },
  {
    title: "Best prices",
    text: "Budget-friendly and customer-centric: our winning combo.",
  },
  {
    title: "Experienced agents",
    text: "Seasoned experts at your service for every trip.",
  },
];

const updates = [
  {
    title: "Covid in Africa",
    text: "Africa's resilience: battling COVID-19 with determination and solidarity.",
    image: "/images/about.jpeg",
  },
  {
    title: "Winter Travel To The Caribbean",
    text: "Winter escape: Caribbean bliss beckons — sun, sand, and serenity await.",
    image: "/images/caribbean.jpeg",
  },
  {
    title: "First Time Jet Guide",
    text: "Your essential first-time jet travel guide: navigating skies with confidence.",
    image: "/images/travel-1.jpg",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative isolate min-h-[88vh] overflow-hidden">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/hero.jpeg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/45 to-[#faf8f4]" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-center px-5 pb-24 pt-28 md:px-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Unlimit your travel life
          </p>
          <h1 className="max-w-3xl font-display text-5xl leading-[1.05] text-white md:text-7xl">
            Enjoy your holiday with our agency
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85 md:text-xl">
            {site.tagline}. Start with a travel request — we research options and
            share them in your personal trip dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <StartTravelButton className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-[#e08c00]">
              Start your travel
            </StartTravelButton>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              View my trip
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
            Trip protection
          </p>
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Great opportunity for adventure & travels
          </h2>
          <p className="mt-3 text-muted">
            We&apos;re here for you from start to finish — cruises, vacations,
            transfers, and insurance under one roof.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
      </section>

      <section id="about" className="bg-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
          <div className="relative min-h-[360px] overflow-hidden rounded-3xl">
            <Image
              src="/images/about.jpeg"
              alt="Travelers exploring the world"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
              About us
            </p>
            <h2 className="font-display text-3xl text-ink md:text-4xl">
              Let our travel agency be your guide
            </h2>
            <p className="mt-4 text-muted leading-relaxed">
              We are a travel adventure company helping you leave footprints in
              every corner. Tour amazing places around the world with trip
              protection, experienced agents, and packages built around comfort.
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
                Cruises, vacations, transfers & insurance
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Get ready to travel, adventure and enjoy nature
          </h2>
          <p className="mt-3 text-muted">Our guarantee to you</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {guarantees.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-line bg-surface px-6 py-8 text-center"
            >
              <h3 className="font-display text-xl text-ink">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/travel-2.jpg)" }}
        />
        <div className="absolute inset-0 bg-ink/70" />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center md:px-8 md:py-28">
          <h2 className="font-display text-3xl text-white md:text-5xl">
            Go exotic places
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Discovery Island kayak tours, floating villas, and destination
            getaways — start planning your next escape with Amore Global.
          </p>
          <StartTravelButton className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-[#e08c00]">
            Start planning
          </StartTravelButton>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl text-ink md:text-4xl">
              What our travelers say
            </h2>
            <p className="mt-3 text-muted">
              Quality service rated 5 out of 5 by guests who trust us with their
              journeys.
            </p>
          </div>
          <div className="grid items-center gap-8 rounded-3xl bg-cream p-6 md:grid-cols-[180px_1fr] md:p-10">
            <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full">
              <Image
                src="/images/testimonial.png"
                alt="Traveler testimonial"
                fill
                className="object-cover"
              />
            </div>
            <blockquote>
              <p className="font-display text-xl leading-relaxed text-ink md:text-2xl">
                &ldquo;Amore Global made our vacation seamless — from airport
                transfer to insurance, everything felt handled with care.&rdquo;
              </p>
              <footer className="mt-4 text-sm font-semibold text-gold-deep">
                James M. Nichols
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      <section id="news" className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="mb-10">
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Updates & advisories
          </h2>
          <p className="mt-3 text-muted">
            Amazing news & notes for every update on the road ahead.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {updates.map((item) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <div className="relative h-44">
                <Image src={item.image} alt={item.title} fill className="object-cover" />
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 md:flex-row md:items-center md:px-8">
          <div>
            <h2 className="font-display text-2xl text-ink md:text-3xl">Newsletter</h2>
            <p className="mt-2 max-w-lg text-muted">
              Subscribe for our latest updates & travel news.
            </p>
          </div>
          <form className="flex w-full max-w-md gap-2" action="/contact-us">
            <input
              type="email"
              required
              placeholder="Email address"
              className="w-full rounded-full border border-line bg-white px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream transition hover:bg-black"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
