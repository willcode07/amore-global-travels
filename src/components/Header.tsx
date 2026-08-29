"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { navLinks, site } from "@/lib/site";

export function Header() {
  const [open, setOpen] = useState(false);
  const browse = navLinks.filter((link) => !link.emphasize);
  const quote = navLinks.find((link) => link.emphasize);

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-md amore-soft-in">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5 md:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <BrandLogo size={48} />
          <span className="font-display text-[1.35rem] leading-none tracking-tight text-ink md:text-2xl">
            {site.name}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 xl:flex">
            {browse.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-ink/75 transition hover:bg-cream hover:text-gold-deep"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-ink/75 transition hover:bg-cream hover:text-gold-deep"
            >
              My Trip
            </Link>
            {quote ? (
              <StartTravelButton className="ml-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-brand transition hover:brightness-95">
                {quote.label}
              </StartTravelButton>
            ) : null}
          </nav>
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface xl:hidden"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">Menu</span>
            <div className="flex w-5 flex-col gap-1.5">
              <span className={`h-0.5 bg-ink transition ${open ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`h-0.5 bg-ink transition ${open ? "opacity-0" : ""}`} />
              <span className={`h-0.5 bg-ink transition ${open ? "-translate-y-2 -rotate-45" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-cream px-5 py-4 xl:hidden">
          <nav className="flex flex-col gap-1">
            {browse.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2.5 text-base font-medium text-ink"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="rounded-xl px-3 py-2.5 text-base font-medium text-ink"
              onClick={() => setOpen(false)}
            >
              My Trip
            </Link>
            {quote ? (
              <StartTravelButton className="mt-2 rounded-full bg-gold px-4 py-3 text-left text-sm font-semibold text-brand">
                {quote.label}
              </StartTravelButton>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
