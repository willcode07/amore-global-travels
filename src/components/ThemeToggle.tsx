"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = resolveTheme();
    applyTheme(current);
    setTheme(current);
    setReady(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readStoredTheme()) return;
      const next = media.matches ? "dark" : "light";
      applyTheme(next);
      setTheme(next);
    };
    media.addEventListener("change", onSystemChange);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = resolveTheme();
      applyTheme(next);
      setTheme(next);
    };
    window.addEventListener("storage", onStorage);

    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }

  const nextLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={nextLabel}
      title={nextLabel}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:border-gold hover:text-gold-deep"
    >
      <span className="sr-only">{nextLabel}</span>
      {ready && theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5M12 19.5V21M4.93 4.93l1.06 1.06M18.01 18.01l1.06 1.06M3 12h1.5M19.5 12H21M4.93 19.07l1.06-1.06M18.01 5.99l1.06-1.06" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.5 15.2A7.2 7.2 0 0 1 9.3 6.1 7.3 7.3 0 1 0 17.5 15.2Z" />
    </svg>
  );
}
