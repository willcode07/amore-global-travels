import Image from "next/image";
import Link from "next/link";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { assetPath } from "@/lib/asset";
import { cruisePackages, vacationRegions } from "@/lib/destinations";
import { journeySteps } from "@/lib/journey";
import { advisories, services, site, travelAdvisoryUrl } from "@/lib/site";

const promises = [
  {
    title: "A real agent",
    text: "Not a booking engine. Someone who listens, then puts a quote in your hands.",
  },
  {
    title: "One dashboard",
    text: "Every request under your email and phone — messages, quotes, and status.",
  },
  {
    title: "No surprise prices on the site",
    text: "Packages stay general on purpose. The number you see is the number we quoted you.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative isolate min-h-[92vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center amore-hero-zoom"
          style={{ backgroundImage: `url(${assetPath("/images/hero.jpeg")})` }}
        />
        <div className="absolute inset-0 bg-background/88" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-end px-5 pb-20 pt-32 md:justify-center md:px-8 md:pb-28">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-gold-deep amore-fade-up">
            Agent-led travel
          </p>
          <h1 className="max-w-3xl font-display text-5xl leading-[0.98] text-ink md:text-7xl amore-fade-up-delay">
            Coming Soon..
          </h1>
          <p className="mt-4 max-w-xl font-display text-2xl text-ink md:text-3xl amore-fade-up-delay">
            Cruises and vacations, planned with care
          </p>
          <p className="mt-4 max-w-lg text-base text-muted md:text-lg amore-fade-up-delay-2">
            {site.tagline}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 amore-fade-up-delay-2">
            <StartTravelButton className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-on-gold transition hover:brightness-95">
              Request a Quote
            </StartTravelButton>
            <Link
              href="/dashboard"
              className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink transition hover:bg-cream"
            >
              View my trips
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
            How it works
          </p>
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            One clear path from curiosity to confirmation
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {journeySteps.map((step, index) => (
            <div key={step.title} className="rounded-3xl border border-line bg-surface p-6">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-gold text-sm font-semibold text-on-gold">
                {index + 1}
              </div>
              <h3 className="font-display text-xl text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <div className="mb-12 max-w-2xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
              Window shop
            </p>
            <h2 className="font-display text-3xl text-ink md:text-4xl">
              Cruises and vacation packages
            </h2>
            <p className="mt-3 text-muted">
              Pick a place that sounds like your trip. Prices stay off this page —
              ask and an agent will write one for your dates and your group.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {vacationRegions.map((region) => (
              <div
                key={region.slug}
                className="overflow-hidden rounded-[1.4rem] bg-surface shadow-[var(--shadow-soft)]"
              >
                <div className="relative h-48">
                  <Image
                    src={region.image}
                    alt={region.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                    {region.eyebrow}
                  </p>
                  <h3 className="mt-1 font-display text-2xl text-ink">{region.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{region.summary}</p>
                  <p className="mt-3 text-sm font-medium text-ink">
                    Curious what it costs? Ask — we’ll price it for your party.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {region.destinations.map((place) => (
                      <StartTravelButton
                        key={place}
                        destination={place}
                        tripType="vacation_package"
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        {place}
                      </StartTravelButton>
                    ))}
                  </div>
                  <StartTravelButton
                    destination={region.name}
                    tripType="vacation_package"
                    className="mt-5 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-on-gold"
                  >
                    Ask for pricing
                  </StartTravelButton>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {cruisePackages.map((sailing) => (
              <div
                key={sailing.slug}
                className="overflow-hidden rounded-[1.4rem] bg-surface shadow-[var(--shadow-soft)]"
              >
                <div className="relative h-48">
                  <Image
                    src={sailing.image}
                    alt={sailing.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                    {sailing.eyebrow}
                  </p>
                  <h3 className="mt-1 font-display text-2xl text-ink">{sailing.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{sailing.summary}</p>
                  <p className="mt-3 text-sm font-medium text-ink">
                    Curious what it costs? Ask — we’ll price the sailing for your party.
                  </p>
                  <StartTravelButton
                    destination={sailing.destination}
                    tripType="cruise"
                    className="mt-5 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-on-gold"
                  >
                    Ask for pricing
                  </StartTravelButton>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/vacation-packages"
              className="text-sm font-semibold text-gold-deep underline underline-offset-4"
            >
              Vacation packages
            </Link>
            <Link
              href="/cruises"
              className="text-sm font-semibold text-gold-deep underline underline-offset-4"
            >
              Cruises
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
            Services
          </p>
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Travel insurance and keeping the trip close
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="group overflow-hidden rounded-[1.4rem] bg-surface shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <h3 className="font-display text-xl text-ink">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {service.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:px-8 md:py-24">
        <div className="relative min-h-[380px] overflow-hidden rounded-[1.6rem]">
          <Image
            src={assetPath("/images/about.jpeg")}
            alt="Travelers exploring the world"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
            About Us
          </p>
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Family-run planning from Fayetteville
          </h2>
          <p className="mt-4 text-muted leading-relaxed">
            Amore Global helps travelers book cruises and vacations with an agent
            who listens, guides, and follows through — from first question to
            confirmed trip.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink">
            {promises.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span>
                  <strong>{item.title}.</strong> {item.text}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/about"
            className="mt-7 inline-block text-sm font-semibold text-gold-deep underline underline-offset-4"
          >
            Read more about us
          </Link>
        </div>
      </section>

      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${assetPath("/images/travel-2.jpg")})` }}
        />
        <div className="absolute inset-0 bg-background/90" />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center md:px-8 md:py-28">
          <h2 className="font-display text-3xl text-ink md:text-5xl">
            Ready when you are
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Share a destination and a window. We will come back with a quote you
            can sit with — not a checkout page.
          </p>
          <StartTravelButton className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-on-gold transition hover:brightness-95">
            Request a Quote
          </StartTravelButton>
        </div>
      </section>

      <section id="news" className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-ink md:text-4xl">
              Updates & Advisories
            </h2>
            <p className="mt-3 text-muted">Notes worth reading before you fly.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a
              href={travelAdvisoryUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-gold-deep underline underline-offset-4"
            >
              Official U.S. travel advisories
            </a>
            <Link
              href="/updates"
              className="text-sm font-semibold text-gold-deep underline underline-offset-4"
            >
              View all updates
            </Link>
          </div>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {advisories.map((item) => (
            <article key={item.title} className="group">
              <div className="relative mb-4 h-48 overflow-hidden rounded-[1.25rem]">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
              </div>
              <h3 className="font-display text-lg text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              {"href" in item && item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-semibold text-gold-deep underline underline-offset-4"
                >
                  Read the official advisory
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
