import { validateStoredPhone } from "@/lib/phone";
import { TravelRequest, TripIntake, TripType } from "@/lib/types";

export const CHILD_MAX_AGE = 17;
export const ADULT_MIN_AGE = 18;
export const MAX_PARTY_SIZE = 12;
export const US_MAILING_COUNTRY = "United States";

export const mailingCountries = [
  "United States",
  "Canada",
  "Jamaica",
  "Bahamas",
  "Barbados",
  "Ghana",
  "Nigeria",
  "Kenya",
  "United Kingdom",
  "Mexico",
  "Other",
] as const;

export function isUsMailingCountry(country: string | undefined) {
  const value = (country ?? "").trim();
  return !value || value === US_MAILING_COUNTRY;
}

export type QuoteIntakeFields = {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
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
  adultNames?: string[];
  childrenCount: string;
  childrenAges?: string;
  childDobs: string[];
  childNames?: string[];
  pets: boolean;
  supportAnimal: boolean;
  preferredAgent: string;
  datesFlexible?: boolean;
  nickname?: string;
};

export type IntakeStage = "quote" | "booking" | "full";

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

export function formatTimestamp(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function isFlexibleDateMode(trip: TravelRequest["trip"]) {
  if (trip.dateMode === "flexible") return true;
  if (trip.dateMode === "fixed") return false;
  return /flexible/i.test(`${trip.travelWindow} ${trip.requestedTravelWindow ?? ""}`);
}

export function tripNickname(request: TravelRequest) {
  return request.trip.nickname?.trim() || request.trip.destination;
}

export function formatTripWindow(trip: TravelRequest["trip"]) {
  const window = trip.travelWindow?.trim() || "";
  if (isFlexibleDateMode(trip)) {
    if (window && !/flexible/i.test(window)) {
      return `Flexible dates · preferred ${window}`;
    }
    return "Flexible dates";
  }
  return window || "Dates TBD";
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

export type NamedTraveler = {
  key: string;
  role: "adult" | "child";
  label: string;
  name: string;
  age?: number;
  dob?: string;
};

export function namedTravelers(request: TravelRequest): NamedTraveler[] {
  const party = tripPartyCounts(request.trip);
  const intake = request.intake;
  const requester =
    [intake?.firstName, intake?.lastName].filter(Boolean).join(" ").trim() ||
    request.traveler.fullName.trim();
  const adultNames = intake?.adultNames?.length
    ? intake.adultNames
    : request.trip.adultNames ?? [];
  const childNames = intake?.childNames?.length
    ? intake.childNames
    : request.trip.childNames ?? [];
  const adultAges = request.trip.adultAges ?? [];
  const childAges = request.trip.childAges ?? [];
  const adultDobs = intake?.adultDobs ?? [];
  const childDobs = intake?.childDobs ?? [];

  const adults = Array.from({ length: party.adultsCount }, (_, index) => {
    const named = String(adultNames[index] ?? "").trim();
    return {
      key: `adult-${index}`,
      role: "adult" as const,
      label: index === 0 ? "Primary traveler" : `Adult ${index + 1}`,
      name: named || (index === 0 ? requester : "") || `Adult ${index + 1}`,
      age: adultAges[index],
      dob: adultDobs[index]?.trim() || undefined,
    };
  });
  const children = Array.from({ length: party.childrenCount }, (_, index) => {
    const named = String(childNames[index] ?? "").trim();
    return {
      key: `child-${index}`,
      role: "child" as const,
      label: `Child ${index + 1}`,
      name: named || `Child ${index + 1}`,
      age: childAges[index],
      dob: childDobs[index]?.trim() || undefined,
    };
  });
  return [...adults, ...children];
}

export function formatRequestParty(request: TravelRequest) {
  return namedTravelers(request)
    .map((person) => {
      const bits = [
        person.role === "child" ? "child" : "",
        person.age != null ? String(person.age) : person.dob ? formatDisplayDate(person.dob) : "",
      ].filter(Boolean);
      return bits.length ? `${person.name} (${bits.join(", ")})` : person.name;
    })
    .join(" · ");
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
  const adultCount = Number(adultsCount) || 2;
  const childCount = Number(childrenCount) || 0;
  const requesterName = [intake?.firstName || names.firstName, intake?.lastName || names.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const adultNames = resizeList(
    intake?.adultNames?.length ? intake.adultNames : request.trip.adultNames,
    adultCount,
    "",
  ).map((name, index) => name.trim() || (index === 0 ? requesterName : ""));
  const childNames = resizeList(
    intake?.childNames?.length ? intake.childNames : request.trip.childNames,
    childCount,
    "",
  );
  const datesFlexible =
    intake?.datesFlexible ??
    isFlexibleDateMode(request.trip) ??
    false;

  return {
    firstName: intake?.firstName || names.firstName,
    lastName: intake?.lastName || names.lastName,
    address1: intake?.address1 ?? "",
    address2: intake?.address2 ?? "",
    city: intake?.city ?? "",
    state: intake?.state ?? "",
    zip: intake?.zip ?? "",
    country: intake?.country || US_MAILING_COUNTRY,
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
    adultDobs: resizeDobs(intake?.adultDobs, adultCount),
    adultNames,
    childrenCount,
    childDobs: resizeDobs(intake?.childDobs, childCount),
    childNames,
    pets: intake?.pets ?? false,
    supportAnimal: intake?.supportAnimal ?? false,
    preferredAgent: intake?.preferredAgent || request.trip.preferredAgent,
    tripType: intake?.tripType || request.trip.tripType,
    datesFlexible,
    nickname: intake?.nickname || request.trip.nickname || request.trip.destination,
  };
}

export function toTripIntake(
  data: QuoteIntakeFields,
  tripType: TripType,
  completedAt = new Date().toISOString(),
): TripIntake {
  const adults = Number(data.adultsCount) || 0;
  const children = Number(data.childrenCount) || 0;
  const bookingReady = Object.keys(validateQuoteIntake(data, tripType, "booking").errors).length === 0;
  return {
    completedAt: bookingReady ? completedAt || new Date().toISOString() : "",
    firstName: data.firstName,
    lastName: data.lastName,
    address1: data.address1,
    address2: data.address2,
    city: data.city,
    state: data.state,
    zip: data.zip,
    country: data.country?.trim() || US_MAILING_COUNTRY,
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
    adultDobs: resizeDobs(data.adultDobs, adults),
    adultNames: resizeList(data.adultNames, adults, "").map((name, index) =>
      name.trim() || (index === 0 ? [data.firstName, data.lastName].filter(Boolean).join(" ") : ""),
    ),
    childrenCount: data.childrenCount,
    childDobs: resizeDobs(data.childDobs, children),
    childNames: resizeList(data.childNames, children, ""),
    pets: data.pets,
    supportAnimal: data.supportAnimal,
    preferredAgent: data.preferredAgent,
    tripType,
    datesFlexible: Boolean(data.datesFlexible),
    nickname: data.nickname?.trim() || data.destination,
  };
}

export function travelerCountFromIntake(intake: Pick<TripIntake, "adultsCount" | "childrenCount">) {
  return (Number(intake.adultsCount) || 0) + (Number(intake.childrenCount) || 0);
}

export function formatIntakeAddress(intake: TripIntake) {
  const lines = [intake.address1, intake.address2, intake.city, intake.state, intake.zip]
    .map((part) => part.trim())
    .filter(Boolean);
  if (!isUsMailingCountry(intake.country) && intake.country?.trim()) {
    lines.push(intake.country.trim());
  }
  return lines.join(", ");
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
  stage: IntakeStage = "full",
): { errors: IntakeFieldErrors; warnings: string[] } {
  const errors: IntakeFieldErrors = {};
  const warnings: string[] = [];
  const booking = stage === "booking" || stage === "full";
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (!data.firstName.trim()) errors.firstName = "Enter a first name.";
  if (!data.lastName.trim()) errors.lastName = "Enter a last name.";

  const usAddress = isUsMailingCountry(data.country);
  if (booking) {
    if (!data.address1.trim()) errors.address1 = "Enter a street address.";
    if (!data.city.trim()) errors.city = "Enter a city.";
    if (usAddress) {
      if (!data.state.trim()) errors.state = "Select a state.";
      if (!/^\d{5}$/.test(data.zip.trim())) errors.zip = "Enter a 5-digit ZIP code.";
    } else {
      if (!data.state.trim()) errors.state = "Enter a region or province.";
      if (!data.zip.trim()) errors.zip = "Enter a postal code.";
    }
  } else if (usAddress && data.zip.trim() && !/^\d{5}$/.test(data.zip.trim())) {
    errors.zip = "Enter a 5-digit ZIP code, or leave it blank until booking.";
  }

  const phoneError = validateStoredPhone(data.phone);
  if (phoneError) errors.phone = phoneError;
  if (!EMAIL_PATTERN.test(data.email.trim())) errors.email = "Enter a valid email address.";
  if (!data.destination.trim()) errors.destination = "Enter a destination.";

  const datesRequired = booking && !data.datesFlexible;
  if (datesRequired || data.departureDate || data.returnDate) {
    if (data.departureDate && !isIsoDate(data.departureDate)) {
      errors.departureDate = "Choose a departure date.";
    } else if (datesRequired && !isIsoDate(data.departureDate)) {
      errors.departureDate = "Choose a departure date, or mark dates as flexible.";
    }
    if (data.returnDate && !isIsoDate(data.returnDate)) {
      errors.returnDate = "Choose a return date.";
    } else if (datesRequired && !isIsoDate(data.returnDate)) {
      errors.returnDate = "Choose a return date, or mark dates as flexible.";
    } else if (
      isIsoDate(data.departureDate) &&
      isIsoDate(data.returnDate) &&
      data.returnDate < data.departureDate
    ) {
      errors.returnDate = "Return date cannot be before departure.";
    }
  }

  const adults = Number(data.adultsCount);
  if (!Number.isInteger(adults) || adults < 1 || adults > 12) {
    errors.adultsCount = "Enter between 1 and 12 adults.";
  } else if (booking) {
    const dobs = resizeDobs(data.adultDobs, adults);
    dobs.forEach((dob, index) => {
      if (!isIsoDate(dob)) {
        errors[`adultDob-${index}`] = `Enter a date of birth for Adult ${index + 1}.`;
      } else if (dob > today) {
        errors[`adultDob-${index}`] = "Date of birth cannot be in the future.";
      } else if (isIsoDate(data.departureDate) && dob > data.departureDate) {
        errors[`adultDob-${index}`] = "Date of birth must be before departure.";
      }
    });
  } else {
    resizeDobs(data.adultDobs, adults).forEach((dob, index) => {
      if (!dob) return;
      if (!isIsoDate(dob)) {
        errors[`adultDob-${index}`] = `Enter a valid date of birth for Adult ${index + 1}.`;
      } else if (dob > today) {
        errors[`adultDob-${index}`] = "Date of birth cannot be in the future.";
      }
    });
  }

  const children = Number(data.childrenCount);
  if (!Number.isInteger(children) || children < 0 || children > 12) {
    errors.childrenCount = "Enter between 0 and 12 children.";
  } else {
    const dobs = resizeDobs(data.childDobs, children);
    dobs.forEach((dob, index) => {
      if (!dob && !booking) return;
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
  if (booking) {
    if (data.accessibilityNeeded !== "Yes" && data.accessibilityNeeded !== "No") {
      errors.accessibilityNeeded = "Select whether accessibility is needed.";
    }
    if (tripType === "cruise" && !data.transportationModes.includes("Cruise")) {
      errors.transportationModes = "Cruise trips need Cruise as a mode of transportation.";
    } else if (tripType !== "cruise" && data.transportationModes.length === 0) {
      errors.transportationModes = "Select at least one mode of transportation.";
    }
  } else if (tripType === "cruise" && data.transportationModes.length > 0 && !data.transportationModes.includes("Cruise")) {
    errors.transportationModes = "Cruise trips need Cruise as a mode of transportation.";
  }

  return { errors, warnings };
}
