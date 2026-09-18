import Link from "next/link";
import { StartTravelButton } from "@/components/RequestModalProvider";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="font-display text-4xl text-ink">Page not found</h1>
      <p className="mt-3 text-muted">
        That link is not on this site. Start a quote from the button below — do
        not use a root <span className="whitespace-nowrap">/request-a-quote</span>{" "}
        path on GitHub Pages.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <StartTravelButton className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-on-gold">
          Request a Quote
        </StartTravelButton>
        <Link
          href="/"
          className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink"
        >
          Home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink"
        >
          My trip dashboard
        </Link>
      </div>
    </section>
  );
}
