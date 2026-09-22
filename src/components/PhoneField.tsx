"use client";

import { useEffect, useState } from "react";
import { digitsOnly, formatInternationalPhone, parseStoredPhone, phoneCountries } from "@/lib/phone";

type PhoneFieldProps = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  autoComplete?: string;
};

export function PhoneField({
  label = "Phone",
  value,
  onChange,
  error,
  required,
  hint,
  autoComplete = "tel-national",
}: PhoneFieldProps) {
  const parts = parseStoredPhone(value);
  const [countryId, setCountryId] = useState(parts.countryId);

  useEffect(() => {
    const next = parseStoredPhone(value);
    if (digitsOnly(next.national).length > 0) {
      setCountryId(next.countryId);
      return;
    }
    if (!value.trim()) {
      setCountryId("US");
      return;
    }
    if (next.countryId !== "US") {
      setCountryId(next.countryId);
    }
  }, [value]);

  const country = phoneCountries.find((item) => item.id === countryId) ?? phoneCountries[0];
  const maxDigits = country.nationalDigits.max;
  const tooLong = digitsOnly(parts.national).length > maxDigits;
  const liveError = error || (tooLong ? `Use up to ${maxDigits} digits.` : "");

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="grid grid-cols-[minmax(8.5rem,38%)_1fr] gap-2">
        <select
          value={countryId}
          aria-label="Country code"
          onChange={(event) => {
            const nextCountry = event.target.value;
            setCountryId(nextCountry);
            onChange(formatInternationalPhone(nextCountry, parts.national));
          }}
          className={`w-full rounded-xl border bg-surface px-3 py-3 text-sm outline-none ring-gold focus:ring-2 ${
            liveError ? "border-red-500" : "border-line"
          }`}
        >
          {phoneCountries.map((item) => (
            <option key={item.id} value={item.id}>
              {item.dial ? `${item.label} +${item.dial}` : item.label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          value={parts.national}
          onChange={(event) => {
            onChange(formatInternationalPhone(countryId, event.target.value));
          }}
          placeholder={country.dial === "1" ? "4045550101" : "Phone number"}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(liveError)}
          className={`w-full rounded-xl border bg-surface px-4 py-3 outline-none ring-gold focus:ring-2 ${
            liveError ? "border-red-500" : "border-line"
          }`}
        />
      </div>
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      {liveError ? <span className="mt-1 block text-xs text-red-700">{liveError}</span> : null}
    </label>
  );
}
