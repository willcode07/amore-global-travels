export type PhoneParts = {
  dial: string;
  national: string;
};

/** Default US country calling code shown in the phone field. */
export const DEFAULT_DIAL = "1";

const US_NATIONAL_DIGITS = 10;
const E164_MIN = 8;
const E164_MAX = 15;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function formatInternationalPhone(dial: string, national: string) {
  const dialDigits = digitsOnly(dial) || DEFAULT_DIAL;
  const nationalDigits = digitsOnly(national);
  if (!nationalDigits) return `+${dialDigits}`;
  return `+${dialDigits} ${nationalDigits}`;
}

export function parseStoredPhone(value: string): PhoneParts {
  const trimmed = value.trim();
  if (!trimmed) return { dial: DEFAULT_DIAL, national: "" };

  if (trimmed.startsWith("+")) {
    const rest = trimmed.slice(1).trim();
    const spaceMatch = rest.match(/^(\d+)\s+(.*)$/);
    if (spaceMatch) {
      return {
        dial: digitsOnly(spaceMatch[1]) || DEFAULT_DIAL,
        national: digitsOnly(spaceMatch[2]),
      };
    }

    const digits = digitsOnly(rest);
    if (!digits) return { dial: DEFAULT_DIAL, national: "" };
    // Dial-only values such as "+1" or "+52".
    if (digits.length <= 3) {
      return { dial: digits, national: "" };
    }
    if (digits.startsWith(DEFAULT_DIAL) && digits.length === 1 + US_NATIONAL_DIGITS) {
      return { dial: DEFAULT_DIAL, national: digits.slice(1) };
    }
    // Prefer a 1–3 digit calling code so compact international numbers still split.
    for (const len of [1, 2, 3]) {
      if (digits.length <= len) continue;
      const dial = digits.slice(0, len);
      const national = digits.slice(len);
      const total = dial.length + national.length;
      if (total < E164_MIN || total > E164_MAX) continue;
      if (dial === DEFAULT_DIAL && national.length !== US_NATIONAL_DIGITS) continue;
      return { dial, national };
    }
    return { dial: DEFAULT_DIAL, national: digits };
  }

  const digits = digitsOnly(trimmed);
  if (digits.length === US_NATIONAL_DIGITS) {
    return { dial: DEFAULT_DIAL, national: digits };
  }
  if (digits.startsWith(DEFAULT_DIAL) && digits.length === 1 + US_NATIONAL_DIGITS) {
    return { dial: DEFAULT_DIAL, national: digits.slice(1) };
  }
  return { dial: DEFAULT_DIAL, national: digits };
}

export function validatePhoneParts(dial: string, national: string) {
  const dialDigits = digitsOnly(dial);
  const nationalDigits = digitsOnly(national);

  if (!dialDigits) return "Enter a country code.";
  if (!nationalDigits) return "Enter a phone number.";

  if (dialDigits === DEFAULT_DIAL) {
    if (nationalDigits.length !== US_NATIONAL_DIGITS) {
      return `Enter a ${US_NATIONAL_DIGITS}-digit US number.`;
    }
    return "";
  }

  const total = dialDigits.length + nationalDigits.length;
  if (total < E164_MIN || total > E164_MAX) {
    return `Enter a phone number with country code, ${E164_MIN}–${E164_MAX} digits.`;
  }
  return "";
}

export function validateStoredPhone(value: string) {
  const parts = parseStoredPhone(value);
  return validatePhoneParts(parts.dial, parts.national);
}
