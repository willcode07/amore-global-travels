"use client";

import { useEffect, useState } from "react";
import {
  digitsOnly,
  formatInternationalPhone,
  parseStoredPhone,
  phoneCountries,
  phoneCountryById,
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

function callingCodeLabel(id: string) {
  const country = phoneCountryById(id);
  if (!country.dial) return "Other";
  const shared = phoneCountries.some(
    (item) => item.id !== country.id && item.dial === country.dial,
  );
  if (!shared) return `+${country.dial}`;
  if (country.id === "US") return "+1";
  return `+${country.dial} ${country.label}`;
}

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
  const [countryId, setCountryId] = useState(initial.countryId);
  const [national, setNational] = useState(digitsOnly(initial.national));

  useEffect(() => {
    if (value === formatInternationalPhone(countryId, national)) return;
    const parsed = parseStoredPhone(value);
    const nextNational = digitsOnly(parsed.national);
    if (parsed.countryId !== countryId) setCountryId(parsed.countryId);
    if (nextNational !== national) setNational(nextNational);
  }, [value, countryId, national]);

  const country = phoneCountryById(countryId);
  const maxDigits = country.nationalDigits.max;
  const tooLong = national.length > maxDigits;
  const liveError = error || (tooLong ? `Use up to ${maxDigits} digits.` : "");

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="flex gap-2">
        <select
          value={countryId}
          aria-label="Country code"
          onChange={(event) => {
            const nextCountry = event.target.value;
            setCountryId(nextCountry);
            onChange(formatInternationalPhone(nextCountry, national));
          }}
          className={`w-40 shrink-0 rounded-xl border bg-surface px-3 py-3 text-sm outline-none ring-gold focus:ring-2 ${
            liveError ? "border-red-500" : "border-line"
          }`}
        >
          {phoneCountries.map((item) => (
            <option key={item.id} value={item.id}>
              {callingCodeLabel(item.id)}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          value={national}
          onChange={(event) => {
            const nextNational = digitsOnly(event.target.value);
            setNational(nextNational);
            onChange(formatInternationalPhone(countryId, nextNational));
          }}
          placeholder={country.dial === "1" ? "4045550101" : "Phone number"}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(liveError)}
          className={`min-w-0 flex-1 rounded-xl border bg-surface px-4 py-3 outline-none ring-gold focus:ring-2 ${
            liveError ? "border-red-500" : "border-line"
          }`}
        />
      </div>
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      {liveError ? <span className="mt-1 block text-xs text-red-700">{liveError}</span> : null}
    </label>
  );
}
