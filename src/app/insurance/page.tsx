import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { StartTravelButton } from "@/components/RequestModalProvider";

export const metadata: Metadata = {
  title: "Travel Insurance",
  description:
    "Get an Allianz travel insurance quote online and buy trip protection in minutes — or ask Amore Global to include it with your vacation quote.",
};

const offerings = [
  {
    title: "Quote in minutes",
    text: "Enter your trip details in the Allianz tool below and see coverage options and pricing right away.",
  },
  {
    title: "Buy when you are ready",
    text: "Choose a plan and complete purchase through Allianz — no waiting on a callback to get protected.",
  },
  {
    title: "Agent help if you want it",
    text: "Planning a cruise or vacation with us? Ask us to include protection on your written trip proposal.",
  },
];

const WIDGET_SRC =
  "https://www.agentmaxonline.com/agentmaxweb/storefront/index.html#/quotemax?widgetid=1294035&accam=F216814&code=ABIYU4TLWGBGTNHC6ZWLRSKAR65GB6C5JLBJOIXR7QY3M6I5HDDPSI6DAIFBVESZNGXHPHUCUXWJV6QHONWQ3EV2VR5GX76KDWWMRCYHFSK5TVAGBKJTGQPD72R24IZY";

export default function InsurancePage() {
  return (
    <>
      <PageHero
        title="Travel Insurance"
        subtitle="Get an Allianz quote on this page and buy trip protection when you are ready."
        image="/images/about.jpeg"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            Protect the trip before you go
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Use the Allianz quote tool below to price travel insurance for your
            dates and destination. You can review plan options, see what each
            covers, and purchase coverage online. Prefer an agent to bundle
            protection with flights and hotels? Start a trip request and we will
            include it on your proposal.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {offerings.map((item) => (
            <div key={item.title} className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-display text-xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h3 className="font-display text-2xl text-ink md:text-3xl">
            Start your Allianz quote
          </h3>
          <p className="mt-2 max-w-2xl text-muted">
            Fill in your trip details in the form below to view Allianz plans and
            pricing. The quote and purchase flow is provided by Allianz Partners
            through AgentMax.
          </p>
          <div className="mt-8 flex justify-center overflow-x-auto">
            <iframe
              title="Allianz travel insurance quote"
              src={WIDGET_SRC}
              width={600}
              height={390}
              frameBorder={0}
              className="max-w-full shrink-0 border-0 bg-surface"
            />
          </div>
        </div>

        <div className="mt-16 rounded-3xl bg-cream p-8 md:p-10">
          <h3 className="font-display text-2xl text-ink">
            Want coverage with your trip plan?
          </h3>
          <p className="mt-2 max-w-xl text-muted">
            Request a cruise or vacation quote and mention travel insurance. We
            can include Allianz options next to the itinerary so you compare the
            full trip in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <StartTravelButton className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-on-gold">
              Request a Quote
            </StartTravelButton>
            <Link
              href="/contact-us"
              className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
