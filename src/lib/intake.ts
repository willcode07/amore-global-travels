import { validateStoredPhone } from "@/lib/phone";
import { TravelRequest, TripIntake, TripType } from "@/lib/types";

export const CHILD_MAX_AGE = 17;
export const ADULT_MIN_AGE = 18;
export const MAX_PARTY_SIZE = 12;

export type QuoteIntakeFields = {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  preferredContactMethods: string[];
  destination: string;
  transportationModes: string[];
  departureDate: string;
  returnDate: string;
  preferences: string;
  accessibilityNeeded: string;
  accessibilityNotes: string;
  adultsCount: string;
  adultsAges?: string;
  adultDobs: string[];
  childrenCount: string;
  childrenAges?: string;
  childDobs: string[];
  pets: boolean;
  supportAnimal: boolean;
  preferredAgent: string;
};

export function isIntakeComplete(request: TravelRequest) {
  return Boolean(request.intake?.completedAt);
}

export function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function toInputDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTravelWindow(window: string) {
  const iso = window.match(/\d{4}-\d{2}-\d{2}/g);
  if (iso && iso.length > 0) {
    return { departureDate: iso[0], returnDate: iso[1] ?? "" };
  }
  const parts = window.split(/\s*[–—-]\s*/);
  return {
    departureDate: toInputDate(parts[0] ?? ""),
    returnDate: toInputDate(parts[1] ?? ""),
  };
}

export function formatDisplayDate(iso: string) {
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTravelWindow(
  departureDate: string,
  returnDate: string,
  fallback: string,
) {
  if (departureDate && returnDate) {
    return `${formatDisplayDate(departureDate)} – ${formatDisplayDate(returnDate)}`;
  }
  if (departureDate) return formatDisplayDate(departureDate);
  if (returnDate) return formatDisplayDate(returnDate);
  return fallback;
}

export function resizeList<T>(current: T[] | undefined, count: number, fill: T) {
  const n = Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0);
  const source = Array.isArray(current) ? current : [];
  if (source.length === n) return source;
  if (source.length < n) {
    return [...source, ...Array.from({ length: n - source.length }, () => fill)];
  }
  return source.slice(0, n);
}

export function resizeDobs(current: string[] | undefined, count: number) {
  const source = Array.isArray(current)
    ? current.map((value) => toInputDate(String(value)))
    : [];
  return resizeList(source, count, "");
}

export function parseAge(value: string | number | undefined) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const age = Number(trimmed);
  if (!Number.isInteger(age)) return null;
  return age;
}

export function parseAgeList(values: Array<string | number> | undefined) {
  return (values ?? [])
    .map((value) => parseAge(value))
    .filter((age): age is number => age !== null);
}

export function formatAgeList(ages: Array<string | number> | undefined) {
  return parseAgeList(ages)
    .map((age) => String(age))
    .join(", ");
}

export function formatDobList(dobs: string[] | undefined) {
  return (dobs ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => formatDisplayDate(value) || value)
    .join("; ");
}

export function formatPartySummary(intake: Pick<
  TripIntake,
  "adultsCount" | "childrenCount" | "adultDobs" | "childDobs" | "adultsAges" | "childrenAges"
>) {
  const adultDobs = formatDobList(intake.adultDobs);
  const childDobs = formatDobList(intake.childDobs);
  const adults = adultDobs || intake.adultsAges || "";
  const children = childDobs || intake.childrenAges || "";
  return [
    `Adults ${intake.adultsCount || "0"}${adults ? ` — ${adults}` : ""}`,
    `Children 17 and under ${intake.childrenCount || "0"}${children ? ` — ${children}` : ""}`,
  ].join(" · ");
}

export function tripPartyCounts(trip: TravelRequest["trip"]) {
  const childrenCount = Math.max(0, Number(trip.childrenCount) || 0);
  const adultsFromField = Number(trip.adultsCount);
  const adultsCount =
    Number.isInteger(adultsFromField) && adultsFromField > 0
      ? adultsFromField
      : Math.max(1, (Number(trip.travelers) || 1) - childrenCount);
  return {
    adultsCount,
    childrenCount,
    travelers: adultsCount + childrenCount,
  };
}

export function formatTripParty(trip: TravelRequest["trip"]) {
  const { adultsCount, childrenCount } = tripPartyCounts(trip);
  const adultAges = formatAgeList(trip.adultAges);
  const childAges = formatAgeList(trip.childAges);
  return [
    `Adults ${adultsCount}${adultAges ? ` — ${adultAges}` : ""}`,
    `Children 17 and under ${childrenCount}${childAges ? ` — ${childAges}` : ""}`,
  ].join(" · ");
}

export function formatRequestParty(request: TravelRequest) {
  if (request.intake && (request.intake.adultsCount || request.intake.childrenCount)) {
    return formatPartySummary(request.intake);
  }
  return formatTripParty(request.trip);
}

export function validateQuotePartyAges(input: {
  adultAges: Array<string | number>;
  childAges: Array<string | number>;
  adultsCount: number;
  childrenCount: number;
}) {
  const errors: string[] = [];
  if (!Number.isInteger(input.adultsCount) || input.adultsCount < 1 || input.adultsCount > MAX_PARTY_SIZE) {
    errors.push("Enter between 1 and 12 adults.");
  } else if (input.adultAges.length !== input.adultsCount) {
    errors.push("Enter an age for each adult.");
  } else {
    input.adultAges.forEach((value, index) => {
      const age = parseAge(value);
      if (age === null || age < ADULT_MIN_AGE || age > 120) {
        errors.push(`Adult ${index + 1} needs an age ${ADULT_MIN_AGE}–120.`);
      }
    });
  }

  if (!Number.isInteger(input.childrenCount) || input.childrenCount < 0 || input.childrenCount > MAX_PARTY_SIZE) {
    errors.push("Enter between 0 and 12 children.");
  } else if (input.childAges.length !== input.childrenCount) {
    errors.push("Enter an age for each child.");
  } else {
    input.childAges.forEach((value, index) => {
      const age = parseAge(value);
      if (age === null || age < 0 || age > CHILD_MAX_AGE) {
        errors.push(`Child ${index + 1} needs an age 0–${CHILD_MAX_AGE}.`);
      }
    });
  }

  return errors;
}

export function quoteDefaultsFromRequest(request: TravelRequest): QuoteIntakeFields & {
  tripType: TripType;
} {
  const intake = request.intake;
  const names = splitFullName(request.traveler.fullName);
  const dates = parseTravelWindow(request.trip.travelWindow);
  const party = tripPartyCounts(request.trip);
  const travelers = party.travelers > 0 ? String(party.travelers) : "2";
  const adultsCount = intake?.adultsCount || String(party.adultsCount) || travelers || "2";
  const childrenCount = intake?.childrenCount || String(party.childrenCount) || "0";

  return {
    firstName: intake?.firstName || names.firstName,
    lastName: intake?.lastName || names.lastName,
    address1: intake?.address1 ?? "",
    address2: intake?.address2 ?? "",
    city: intake?.city ?? "",
    state: intake?.state ?? "",
    zip: intake?.zip ?? "",
    phone: intake?.phone || request.traveler.phone,
    email: intake?.email || request.traveler.email,
    preferredContactMethods: intake?.preferredContactMethods ?? [],
    destination: intake?.destination || request.trip.destination,
    transportationModes: intake?.transportationModes ?? [],
    departureDate: intake?.departureDate || dates.departureDate,
    returnDate: intake?.returnDate || dates.returnDate,
    preferences: intake?.notes || request.trip.preferences,
    accessibilityNeeded: intake?.accessibilityNeeded ?? "",
    accessibilityNotes: intake?.accessibilityNotes ?? "",
    adultsCount,
    adultDobs: resizeDobs(intake?.adultDobs, Number(adultsCount) || 2),
    childrenCount,
    childDobs: resizeDobs(intake?.childDobs, Number(childrenCount) || 0),
    pets: intake?.pets ?? false,
    supportAnimal: intake?.supportAnimal ?? false,
    preferredAgent: intake?.preferredAgent || request.trip.preferredAgent,
    tripType: intake?.tripType || request.trip.tripType,
  };
}

export function toTripIntake(
  data: QuoteIntakeFields,
  tripType: TripType,
  completedAt = new Date().toISOString(),
): TripIntake {
  return {
    completedAt,
    firstName: data.firstName,
    lastName: data.lastName,
    address1: data.address1,
    address2: data.address2,
    city: data.city,
    state: data.state,
    zip: data.zip,
    phone: data.phone,
    email: data.email,
    preferredContactMethods: data.preferredContactMethods,
    destination: data.destination,
    transportationModes: data.transportationModes,
    departureDate: data.departureDate,
    returnDate: data.returnDate,
    notes: data.preferences,
    accessibilityNeeded: data.accessibilityNeeded,
    accessibilityNotes: data.accessibilityNotes,
    adultsCount: data.adultsCount,
    adultDobs: resizeDobs(data.adultDobs, Number(data.adultsCount) || 0),
    childrenCount: data.childrenCount,
    childDobs: resizeDobs(data.childDobs, Number(data.childrenCount) || 0),
    pets: data.pets,
    supportAnimal: data.supportAnimal,
    preferredAgent: data.preferredAgent,
    tripType,
  };
}

export function travelerCountFromIntake(intake: Pick<TripIntake, "adultsCount" | "childrenCount">) {
  return (Number(intake.adultsCount) || 0) + (Number(intake.childrenCount) || 0);
}

export function formatIntakeAddress(intake: TripIntake) {
  return [intake.address1, intake.address2, intake.city, intake.state, intake.zip]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function ageOnDate(dob: string, onDate: string) {
  if (!isIsoDate(dob) || !isIsoDate(onDate)) return null;
  const [year, month, day] = dob.split("-").map(Number);
  const [onYear, onMonth, onDay] = onDate.split("-").map(Number);
  let age = onYear - year;
  if (onMonth < month || (onMonth === month && onDay < day)) age -= 1;
  return age;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type IntakeFieldErrors = Record<string, string>;

export function validateQuoteIntake(
  data: QuoteIntakeFields,
  tripType: TripType,
): { errors: IntakeFieldErrors; warnings: string[] } {
  const errors: IntakeFieldErrors = {};
  const warnings: string[] = [];
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (!data.firstName.trim()) errors.firstName = "Enter a first name.";
  if (!data.lastName.trim()) errors.lastName = "Enter a last name.";
  if (!data.address1.trim()) errors.address1 = "Enter a street address.";
  if (!data.city.trim()) errors.city = "Enter a city.";
  if (!data.state.trim()) errors.state = "Select a state.";
  if (!/^\d{5}$/.test(data.zip.trim())) errors.zip = "Enter a 5-digit ZIP code.";

  const phoneError = validateStoredPhone(data.phone);
  if (phoneError) errors.phone = phoneError;
  if (!EMAIL_PATTERN.test(data.email.trim())) errors.email = "Enter a valid email address.";
  if (!data.destination.trim()) errors.destination = "Enter a destination.";

  if (!isIsoDate(data.departureDate)) {
    errors.departureDate = "Choose a departure date.";
  }
  if (!isIsoDate(data.returnDate)) {
    errors.returnDate = "Choose a return date.";
  } else if (isIsoDate(data.departureDate) && data.returnDate < data.departureDate) {
    errors.returnDate = "Return date cannot be before departure.";
  }

  const adults = Number(data.adultsCount);
  if (!Number.isInteger(adults) || adults < 1 || adults > 12) {
    errors.adultsCount = "Enter between 1 and 12 adults.";
  } else if (data.adultDobs.length !== adults) {
    errors.adultsCount = "Add a date of birth for each adult.";
  } else {
    data.adultDobs.forEach((dob, index) => {
      if (!isIsoDate(dob)) {
        errors[`adultDob-${index}`] = `Enter a date of birth for Adult ${index + 1}.`;
      } else if (dob > today) {
        errors[`adultDob-${index}`] = "Date of birth cannot be in the future.";
      } else if (isIsoDate(data.departureDate) && dob > data.departureDate) {
        errors[`adultDob-${index}`] = "Date of birth must be before departure.";
      }
    });
  }

  const children = Number(data.childrenCount);
  if (!Number.isInteger(children) || children < 0 || children > 12) {
    errors.childrenCount = "Enter between 0 and 12 children.";
  } else if (data.childDobs.length !== children) {
    errors.childrenCount = "Add a date of birth for each child.";
  } else {
    data.childDobs.forEach((dob, index) => {
      if (!isIsoDate(dob)) {
        errors[`childDob-${index}`] = `Enter a date of birth for Child ${index + 1}.`;
        return;
      }
      if (dob > today) {
        errors[`childDob-${index}`] = "Date of birth cannot be in the future.";
        return;
      }
      if (isIsoDate(data.departureDate) && dob > data.departureDate) {
        errors[`childDob-${index}`] = "Date of birth must be before departure.";
        return;
      }
      const age = ageOnDate(dob, data.departureDate || dob);
      if (age !== null && age >= ADULT_MIN_AGE) {
        warnings.push(
          `Child ${index + 1} will be ${age} on departure. You can still save — or list them as an adult (18+).`,
        );
      }
    });
  }

  if (!tripType) errors.tripType = "Select a trip type.";
  if (data.accessibilityNeeded !== "Yes" && data.accessibilityNeeded !== "No") {
    errors.accessibilityNeeded = "Select whether accessibility is needed.";
  }

  if (tripType === "cruise" && !data.transportationModes.includes("Cruise")) {
    errors.transportationModes = "Cruise trips need Cruise as a mode of transportation.";
  } else if (tripType !== "cruise" && data.transportationModes.length === 0) {
    errors.transportationModes = "Select at least one mode of transportation.";
  }

  return { errors, warnings };
}
