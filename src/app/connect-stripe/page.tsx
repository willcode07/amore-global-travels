import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Connect Stripe Account",
  description: `Secure traveler payments for ${site.name} via Stripe.`,
};

export default function ConnectStripePage() {
  const stripeReady = Boolean(site.stripePaymentLink);

  return (
    <>
      <PageHero
        title="Connect Stripe Account"
        subtitle="Pay deposits and trip balances securely online."
        image="/images/hero.jpeg"
      />

      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <div className="rounded-3xl bg-cream p-8 md:p-10">
          <h2 className="font-display text-3xl text-ink">Stripe payments</h2>
          <p className="mt-3 text-muted">
            Travelers can make payments through our connected Stripe account —
            cards, Apple Pay, and Google Pay where available.
          </p>

          {stripeReady ? (
            <a
              href={site.stripePaymentLink}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-[#e08c00]"
            >
              Continue to secure payment
            </a>
          ) : (
            <div className="mt-8 space-y-4">
              <p className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-muted">
                Stripe is not connected yet. After the agency connects the
                Stripe account, set{" "}
                <code className="text-ink">NEXT_PUBLIC_STRIPE_PAYMENT_LINK</code>{" "}
                to the Payment Link URL from the Stripe Dashboard.
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
                <li>Create or log in to the Amore Global Stripe account</li>
                <li>Dashboard → Payment Links → Create payment link</li>
                <li>Paste the link into the site environment variable</li>
                <li>Redeploy so travelers can pay from this page</li>
              </ol>
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
            <StartTravelButton className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink">
              Fillable Form
            </StartTravelButton>
            <Link
              href="/contact-us"
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
