"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { assetPath } from "@/lib/asset";
import { navLinks, site } from "@/lib/site";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-[#faf8f4]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" onClick={() => setOpen(false)}>
          <Image
            src={assetPath("/images/logo.png")}
            alt={site.name}
            width={52}
            height={52}
            className="h-12 w-12 object-contain"
            priority
          />
          <span className="font-display text-xl tracking-tight text-ink md:text-2xl">
            {site.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-3 2xl:gap-4 xl:flex">
          {navLinks.map((link) =>
            link.opensForm ? (
              <StartTravelButton
                key={link.label}
                className="text-sm font-medium text-ink/80 transition hover:text-gold-deep"
              >
                {link.label}
              </StartTravelButton>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-sm font-medium text-ink/80 transition hover:text-gold-deep"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line xl:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <div className="flex w-5 flex-col gap-1.5">
            <span className={`h-0.5 bg-ink transition ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 bg-ink transition ${open ? "opacity-0" : ""}`} />
            <span className={`h-0.5 bg-ink transition ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </div>
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-cream px-5 py-4 xl:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) =>
              link.opensForm ? (
                <StartTravelButton
                  key={link.label}
                  className="py-1 text-left text-base font-medium text-ink"
                >
                  {link.label}
                </StartTravelButton>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="py-1 text-base font-medium text-ink"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
