import { createId } from "@/lib/ids";
import { formatTravelWindow, travelerCountFromIntake } from "@/lib/intake";
import type { TravelRequest } from "@/lib/types";

export type ResearchKind = "flight" | "stay" | "rental_car" | "cruise";

export type ResearchEvidenceStatus = "unverified" | "approved";

/**
 * An agent-recorded observation from a supplier or publicly available search.
 * It intentionally does not represent a bookable or automatically fetched rate.
 */
export type ResearchEvidence = {
  id: string;
  kind: ResearchKind;
  supplier: string;
  description: string;
  amount: string;
  currency: string;
  priceBasis: string;
  terms: string;
  sourceUrl: string;
  observedAt: string;
  status: ResearchEvidenceStatus;
};

export type ResearchLink = {
  kind: ResearchKind;
  label: string;
  url: string;
};

function queryUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function researchContext(request: TravelRequest) {
  const intake = request.intake;
  const destination = intake?.destination || request.trip.destination;
  const dates = formatTravelWindow(
    intake?.departureDate ?? "",
    intake?.returnDate ?? "",
    request.trip.travelWindow,
  );
  const party = intake
    ? `${travelerCountFromIntake(intake) || request.trip.travelers} travelers`
    : `${request.trip.travelers} travelers`;
  const departure = request.trip.departureCity || "departure city";

  return { dates, departure, destination, party };
}

/**
 * Opens research in a new tab. Results must be checked and entered by an agent;
 * the app never fetches or scrapes supplier pages.
 */
export function researchLinksFor(request: TravelRequest): ResearchLink[] {
  const { dates, departure, destination, party } = researchContext(request);
  const common = `${destination} ${dates} ${party}`;
  const links: ResearchLink[] = [
    {
      kind: "flight",
      label: "Research flights",
      url: queryUrl(`flights ${departure} to ${destination} ${dates} ${party}`),
    },
    {
      kind: "stay",
      label: "Research stays",
      url: queryUrl(`hotels resorts ${common}`),
    },
    {
      kind: "rental_car",
      label: "Research rental cars",
      url: queryUrl(`rental cars ${departure} ${common}`),
    },
  ];

  if (request.trip.tripType === "cruise" || intakeHasCruise(request)) {
    links.push({
      kind: "cruise",
      label: "Research cruises",
      url: queryUrl(`cruises ${common}`),
    });
  }

  return links;
}

function intakeHasCruise(request: TravelRequest) {
  return (request.intake?.transportationModes ?? []).some(
    (mode) => mode.toLowerCase() === "cruise",
  );
}

export function newResearchEvidence(
  kind: ResearchKind,
  request: TravelRequest,
): ResearchEvidence {
  const { dates, destination, party } = researchContext(request);
  return {
    id: createId("research"),
    kind,
    supplier: "",
    description: `${destination} · ${dates}`,
    amount: "",
    currency: "USD",
    priceBasis: party,
    terms: "",
    sourceUrl: "",
    observedAt: new Date().toISOString().slice(0, 10),
    status: "unverified",
  };
}

export function researchKindLabel(kind: ResearchKind) {
  if (kind === "rental_car") return "Rental car";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}
