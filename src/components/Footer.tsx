"use client";

import Image from "next/image";
import Link from "next/link";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { assetPath } from "@/lib/asset";
import { navLinks, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Image
              src={assetPath("/images/logo-alt.png")}
              alt={site.name}
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
            <span className="font-display text-2xl">{site.name}</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-cream/75">
            {site.tagline}. Request a trip, review options, and stay connected
            through your Amore dashboard.
          </p>
        </div>

        <div>
          <h3 className="mb-4 font-display text-lg">Explore</h3>
          <ul className="space-y-2 text-sm text-cream/80">
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
              <Link href="/dashboard" className="transition hover:text-gold">
                My Trip
              </Link>
            </li>
            <li>
              <Link href="/agent" className="transition hover:text-gold">
                Agent inbox
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-display text-lg">Contact</h3>
          <ul className="space-y-2 text-sm text-cream/80">
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

      <div className="border-t border-white/10 py-5 text-center text-xs text-cream/55">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}
