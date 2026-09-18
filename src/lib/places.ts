import {
  commonDepartureCities,
  cruisePackages,
  featuredDestinations,
} from "@/lib/destinations";
import { toStateAbbr } from "@/lib/us-states";

export type PlaceKind = "address" | "city" | "destination";

export type PlaceSuggestion = {
  id: string;
  label: string;
  detail?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export function placeCandidates(kind: PlaceKind): string[] {
  if (kind === "city") return [...commonDepartureCities];
  if (kind === "destination") {
    return [
      ...new Set([
        ...featuredDestinations,
        ...cruisePackages.map((item) => item.destination),
        ...cruisePackages.map((item) => item.name),
      ]),
    ];
  }
  return [];
}

/** One obvious completion, or null when several places still fit. */
export function bestPlaceMatch(query: string, kind: PlaceKind): string | null {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2 || kind === "address") return null;
  const candidates = placeCandidates(kind);
  const prefixes = candidates.filter((item) => item.toLowerCase().startsWith(needle));
  if (prefixes.length === 1) return prefixes[0];
  const includes = candidates.filter((item) => item.toLowerCase().includes(needle));
  if (includes.length === 1) return includes[0];
  return null;
}

export function ghostRemainder(typed: string, match: string | null): string {
  if (!match) return "";
  if (!match.toLowerCase().startsWith(typed.toLowerCase())) return "";
  return match.slice(typed.length);
}

export function suggestionFromLabel(kind: PlaceKind, label: string): PlaceSuggestion {
  if (kind === "city") {
    const [city, region] = label.split(",").map((part) => part.trim());
    return {
      id: `local-city-${label}`,
      label,
      city: city || label,
      state: toStateAbbr(region ?? ""),
    };
  }
  if (kind === "address") {
    return {
      id: `typed-address-${label}`,
      label,
      address1: label,
    };
  }
  return {
    id: `local-${kind}-${label}`,
    label,
  };
}

export async function lookupUsZip(zip: string, signal?: AbortSignal) {
  const digits = zip.replace(/\D/g, "").slice(0, 5);
  if (digits.length !== 5) return null;
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${digits}`, { signal });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      places?: Array<{ "place name"?: string; "state abbreviation"?: string }>;
    };
    const place = body.places?.[0];
    if (!place) return null;
    return {
      city: place["place name"] ?? "",
      state: toStateAbbr(place["state abbreviation"] ?? ""),
      zip: digits,
    };
  } catch {
    return null;
  }
}
