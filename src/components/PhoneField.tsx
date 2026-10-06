"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_DIAL,
  digitsOnly,
  formatInternationalPhone,
  parseStoredPhone,
} from "@/lib/phone";

type PhoneFieldProps = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  autoComplete?: string;
};

const US_MAX_DIGITS = 10;

export function PhoneField({
  label = "Phone",
  value,
  onChange,
  error,
  required,
  hint,
  autoComplete = "tel-national",
}: PhoneFieldProps) {
  const initial = parseStoredPhone(value);
  const [national, setNational] = useState(
    digitsOnly(initial.national).slice(0, US_MAX_DIGITS),
  );

  useEffect(() => {
    if (value === formatInternationalPhone(DEFAULT_DIAL, national)) return;
    const parsed = parseStoredPhone(value);
    const nextNational = digitsOnly(parsed.national).slice(0, US_MAX_DIGITS);
    if (nextNational !== national) setNational(nextNational);
  }, [value, national]);

  const tooLong = national.length > US_MAX_DIGITS;
  const liveError = error || (tooLong ? `Use up to ${US_MAX_DIGITS} digits.` : "");
  const fieldBorder = liveError ? "border-red-500" : "border-line";

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">
        {label}
        {required ? " *" : ""}
      </span>
      <div
        className={`flex overflow-hidden rounded-xl border bg-surface focus-within:ring-2 focus-within:ring-gold ${fieldBorder}`}
      >
        <span
          className="flex shrink-0 items-center border-r border-line px-3.5 py-3 text-sm font-medium tabular-nums tracking-wide text-muted"
          title="United States"
          aria-hidden
        >
          +{DEFAULT_DIAL}
        </span>
        <span className="sr-only">Country code +{DEFAULT_DIAL}, United States</span>
        <input
          type="tel"
          inputMode="numeric"
          value={national}
          onChange={(event) => {
            const nextNational = digitsOnly(event.target.value).slice(0, US_MAX_DIGITS);
            setNational(nextNational);
            onChange(formatInternationalPhone(DEFAULT_DIAL, nextNational));
          }}
          placeholder="4045550101"
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(liveError)}
          aria-label="Phone number"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 tabular-nums outline-none"
        />
      </div>
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      {liveError ? <span className="mt-1 block text-xs text-red-700">{liveError}</span> : null}
    </label>
  );
}
