"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { navLinks, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-brand text-cream">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1.35fr_1fr_1fr] md:px-8">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <BrandLogo size={48} invert />
            <div>
              <div className="font-display text-2xl leading-none">{site.name}</div>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gold/90">
                Travels
              </p>
            </div>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-cream/72">
            {site.tagline}.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Explore
          </h3>
          <ul className="space-y-2.5 text-sm text-cream/80">
            {navLinks.map((link) => (
              <li key={link.label}>
                {link.opensForm ? (
                  <StartTravelButton className="transition hover:text-gold">
                    {link.label}
                  </StartTravelButton>
                ) : (
                  <Link href={link.href} className="transition hover:text-gold">
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
            <li>
              <Link href="/enhance-your-trip" className="transition hover:text-gold">
                Enhance your trip
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="transition hover:text-gold">
                My Trip
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Contact
          </h3>
          <ul className="space-y-2.5 text-sm text-cream/80">
            <li>
              <a href={`mailto:${site.email}`} className="transition hover:text-gold">
                {site.email}
              </a>
            </li>
            <li>
              <a href={site.phoneHref} className="transition hover:text-gold">
                {site.phone}
              </a>
            </li>
            <li>{site.address}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {site.name} Travels. All rights reserved.
      </div>
    </footer>
  );
}
