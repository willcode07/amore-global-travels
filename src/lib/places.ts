import { commonDepartureCities, featuredDestinations } from "@/lib/destinations";
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

type PhotonProperties = {
  osm_id?: number;
  osm_type?: string;
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  district?: string;
  locality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countrycode?: string;
  type?: string;
};

type PhotonFeature = {
  properties?: PhotonProperties;
};

const PHOTON = "https://photon.komoot.io/api/";
const AMORE_LAT = 33.447;
const AMORE_LON = -84.456;

function unique(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function streetLine(props: PhotonProperties) {
  return [props.housenumber, props.street].filter(Boolean).join(" ").trim();
}

function cityName(props: PhotonProperties) {
  return (props.city || props.locality || props.district || "").trim();
}

function fromPhoton(feature: PhotonFeature, kind: PlaceKind, index: number): PlaceSuggestion | null {
  const props = feature.properties;
  if (!props) return null;
  const city = cityName(props);
  const state = toStateAbbr(props.state ?? "");
  const zip = (props.postcode ?? "").replace(/\D/g, "").slice(0, 5);
  const address1 = streetLine(props);
  const country = props.country ?? "";

  if (kind === "address") {
    const label = address1 || props.name || "";
    if (!label) return null;
    return {
      id: `photon-${props.osm_type ?? "x"}-${props.osm_id ?? index}`,
      label,
      detail: unique([city, state || props.state, zip, country === "United States" ? "" : country]).join(", "),
      address1: label,
      city,
      state,
      zip,
    };
  }

  if (kind === "city") {
    const name = city || props.name || "";
    if (!name) return null;
    const label = unique([name, state || props.state]).join(", ");
    return {
      id: `photon-${props.osm_type ?? "x"}-${props.osm_id ?? index}`,
      label,
      detail: unique([props.state, country]).join(", "),
      city: name,
      state,
    };
  }

  const destination = unique([
    props.name,
    props.type === "country" ? "" : city,
    country && country !== props.name ? country : "",
  ]).join(", ");
  if (!destination) return null;
  return {
    id: `photon-${props.osm_type ?? "x"}-${props.osm_id ?? index}`,
    label: destination,
    detail: props.type ? props.type.replace(/_/g, " ") : undefined,
  };
}

function localMatches(kind: PlaceKind, query: string): PlaceSuggestion[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const source = kind === "city" ? commonDepartureCities : featuredDestinations;
  if (kind === "address") return [];
  return source
    .filter((item) => item.toLowerCase().includes(needle))
    .slice(0, 5)
    .map((label) => ({
      id: `local-${kind}-${label}`,
      label,
      detail: kind === "city" ? "Common departure city" : "Amore destination",
      city: kind === "city" ? label.split(",")[0]?.trim() : undefined,
      state: kind === "city" ? toStateAbbr(label.split(",")[1] ?? "") : undefined,
    }));
}

export async function searchPlaces(
  query: string,
  kind: PlaceKind,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  const local = localMatches(kind, trimmed);
  if (trimmed.length < 3) return local;

  const params = new URLSearchParams({
    q: trimmed,
    limit: "6",
    lang: "en",
  });
  if (kind === "city") params.set("layer", "city");
  if (kind === "address") {
    params.set("lat", String(AMORE_LAT));
    params.set("lon", String(AMORE_LON));
    params.set("layer", "house");
  }

  try {
    const response = await fetch(`${PHOTON}?${params.toString()}`, { signal });
    if (!response.ok) return local;
    const body = (await response.json()) as { features?: PhotonFeature[] };
    let remote = (body.features ?? [])
      .map((feature, index) => fromPhoton(feature, kind, index))
      .filter((item): item is PlaceSuggestion => Boolean(item));

    if (kind === "address" && remote.length === 0) {
      params.delete("layer");
      const fallback = await fetch(`${PHOTON}?${params.toString()}`, { signal });
      if (fallback.ok) {
        const fallbackBody = (await fallback.json()) as { features?: PhotonFeature[] };
        remote = (fallbackBody.features ?? [])
          .map((feature, index) => fromPhoton(feature, kind, index))
          .filter((item): item is PlaceSuggestion => Boolean(item));
      }
    }
    const merged = [...local];
    for (const item of remote) {
      if (merged.some((existing) => existing.label.toLowerCase() === item.label.toLowerCase())) {
        continue;
      }
      merged.push(item);
    }
    return merged.slice(0, 8);
  } catch {
    if (signal?.aborted) return [];
    return local;
  }
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
