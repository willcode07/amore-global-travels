export type PhoneCountry = {
  id: string;
  label: string;
  dial: string;
  nationalDigits: { min: number; max: number };
};

export const phoneCountries: PhoneCountry[] = [
  { id: "US", label: "United States", dial: "1", nationalDigits: { min: 10, max: 10 } },
  { id: "CA", label: "Canada", dial: "1", nationalDigits: { min: 10, max: 10 } },
  { id: "JM", label: "Jamaica", dial: "1", nationalDigits: { min: 10, max: 10 } },
  { id: "BS", label: "Bahamas", dial: "1", nationalDigits: { min: 10, max: 10 } },
  { id: "BB", label: "Barbados", dial: "1", nationalDigits: { min: 10, max: 10 } },
  { id: "GH", label: "Ghana", dial: "233", nationalDigits: { min: 9, max: 10 } },
  { id: "NG", label: "Nigeria", dial: "234", nationalDigits: { min: 10, max: 11 } },
  { id: "KE", label: "Kenya", dial: "254", nationalDigits: { min: 9, max: 10 } },
  { id: "GB", label: "United Kingdom", dial: "44", nationalDigits: { min: 10, max: 11 } },
  { id: "MX", label: "Mexico", dial: "52", nationalDigits: { min: 10, max: 10 } },
  { id: "OTHER", label: "Other", dial: "", nationalDigits: { min: 8, max: 15 } },
];

export type PhoneParts = {
  countryId: string;
  national: string;
};

const NANP_HINTS: Record<string, string> = {
  "876": "JM",
  "242": "BS",
  "246": "BB",
};

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function phoneCountryById(id: string) {
  return phoneCountries.find((country) => country.id === id) ?? phoneCountries[0];
}

export function formatInternationalPhone(countryId: string, national: string) {
  const country = phoneCountryById(countryId);
  const nationalDigits = digitsOnly(national);
  if (!nationalDigits) return "";
  if (country.id === "OTHER" || !country.dial) {
    return `+${nationalDigits}`;
  }
  return `+${country.dial} ${nationalDigits}`;
}

export function parseStoredPhone(value: string): PhoneParts {
  const trimmed = value.trim();
  const digits = digitsOnly(trimmed);
  if (!digits) return { countryId: "US", national: "" };

  if (digits.length === 10) {
    return {
      countryId: NANP_HINTS[digits.slice(0, 3)] ?? "US",
      national: digits,
    };
  }

  const withDial = [...phoneCountries]
    .filter((country) => country.dial)
    .sort((left, right) => right.dial.length - left.dial.length);

  for (const country of withDial) {
    if (!digits.startsWith(country.dial)) continue;
    const national = digits.slice(country.dial.length);
    if (
      national.length < country.nationalDigits.min ||
      national.length > country.nationalDigits.max
    ) {
      continue;
    }
    if (country.dial === "1") {
      return {
        countryId: NANP_HINTS[national.slice(0, 3)] ?? "US",
        national,
      };
    }
    return { countryId: country.id, national };
  }

  return { countryId: "OTHER", national: digits };
}

export function validatePhoneParts(countryId: string, national: string) {
  const country = phoneCountryById(countryId);
  const nationalDigits = digitsOnly(national);
  if (!nationalDigits) return "Enter a phone number.";

  if (country.id === "OTHER" || !country.dial) {
    if (nationalDigits.length < 8 || nationalDigits.length > 15) {
      return "Enter a phone number with country code, 8–15 digits.";
    }
    return "";
  }

  const { min, max } = country.nationalDigits;
  if (nationalDigits.length < min || nationalDigits.length > max) {
    if (min === max) {
      return `Enter a ${min}-digit number for ${country.label}.`;
    }
    return `Enter ${min}–${max} digits for ${country.label}.`;
  }
  return "";
}

export function validateStoredPhone(value: string) {
  const parts = parseStoredPhone(value);
  return validatePhoneParts(parts.countryId, parts.national);
}
