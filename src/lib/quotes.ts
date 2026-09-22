import { tripTypeLabels } from "@/lib/agents";
import {
  formatAgeList,
  formatDobList,
  formatRequestParty,
  formatTravelWindow,
  splitFullName,
} from "@/lib/intake";
import { createId } from "@/lib/store";
import {
  QuoteLine,
  QuoteTier,
  TravelOption,
  TravelProposal,
  TravelRequest,
  TripType,
} from "@/lib/types";

export const amenityPresets = [
  "Beachfront access",
  "Swimming pool",
  "Breakfast available",
  "Bar & lounge",
  "Complimentary parking",
  "Free Wi-Fi",
  "Full kitchen",
  "Ocean view",
  "Spa",
  "Kids club",
  "Dining included",
  "Evening entertainment",
  "All-inclusive dining",
];

function nightsBetween(departureDate: string, returnDate: string) {
  if (!departureDate || !returnDate) return "";
  const start = new Date(`${departureDate}T12:00:00`);
  const end = new Date(`${returnDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (nights <= 0) return "";
  return `${nights} night${nights === 1 ? "" : "s"}`;
}

function hasMode(modes: string[] | undefined, needle: string) {
  return (modes ?? []).some((mode) => mode.toLowerCase().includes(needle));
}

export function packagePriceLabel(tripType: TripType) {
  if (tripType === "cruise") return "Cruise";
  if (tripType === "all_inclusive") return "All-inclusive";
  return "Travel Package";
}

export const PRICE_LINE_FLIGHT = "Flight";
export const PRICE_LINE_TRANSPORT = "Transportation";
export const PRICE_LINE_SPECIAL = "Special Requests";

function stayCopy(tripType: TripType) {
  if (tripType === "cruise") {
    return {
      roomLabel: "",
      roomDetails: "",
      amenities: ["Dining included", "Evening entertainment", "Wi-Fi available"],
    };
  }
  if (tripType === "all_inclusive") {
    return {
      roomLabel: "",
      roomDetails: "",
      amenities: ["All-inclusive dining", "Swimming pool", "Free Wi-Fi"],
    };
  }
  return {
    roomLabel: "",
    roomDetails: "",
    amenities: ["Free Wi-Fi", "Swimming pool", "Breakfast available"],
  };
}

function lineAliases(label: string) {
  const name = label.trim().toLowerCase();
  if (
    name === "travel package" ||
    name === "cruise" ||
    name === "all-inclusive" ||
    name === "stay total" ||
    name === "stay" ||
    name === "cruise fare"
  ) {
    return "package";
  }
  if (name === "flight" || name === "flights") return "flight";
  if (name === "transportation" || name === "transfer" || name === "transfers") {
    return "transport";
  }
  if (name === "special requests" || name === "special request") return "special";
  return "";
}

export function orderInvestmentLines(lines: QuoteLine[]): QuoteLine[] {
  const rank = (label: string) => {
    const group = lineAliases(label);
    if (group === "package") return 0;
    if (group === "flight") return 1;
    if (group === "transport") return 2;
    if (group === "special") return 3;
    return 10;
  };
  return [...lines].sort((left, right) => rank(left.label) - rank(right.label));
}

function findLine(lines: QuoteLine[], group: string) {
  return lines.find((line) => lineAliases(line.label) === group);
}

export function normalizeQuotePriceLines(
  quote: TravelProposal,
  tripType: TripType,
): TravelProposal {
  const packageLabel = packagePriceLabel(tripType);
  const pkg = findLine(quote.investmentLines, "package");
  const flight = findLine(quote.investmentLines, "flight");
  const transport = findLine(quote.investmentLines, "transport");
  const special = findLine(quote.investmentLines, "special");
  const extras = quote.investmentLines.filter((line) => !lineAliases(line.label));
  return {
    ...quote,
    investmentLines: [
      { label: packageLabel, amount: pkg?.amount ?? "", note: pkg?.note },
      { label: PRICE_LINE_FLIGHT, amount: flight?.amount ?? "", note: flight?.note },
      {
        label: PRICE_LINE_TRANSPORT,
        amount: transport?.amount ?? "",
        note: transport?.note,
      },
      { label: PRICE_LINE_SPECIAL, amount: special?.amount ?? "", note: special?.note },
      ...extras,
    ],
  };
}

export function emptyProposal(request: TravelRequest): TravelProposal {
  const intake = request.intake;
  const names = splitFullName(request.traveler.fullName);
  const first = intake?.firstName?.trim() || names.firstName || "Your";
  const tripType = intake?.tripType || request.trip.tripType;
  const typeLabel = tripTypeLabels[tripType] ?? "";
  const destination = (
    intake?.destination ||
    request.trip.destination ||
    "Your destination"
  ).trim();
  const departureCity = (request.trip.departureCity || intake?.city || "").trim();
  const dates =
    formatTravelWindow(
      intake?.departureDate ?? "",
      intake?.returnDate ?? "",
      request.trip.travelWindow,
    ) || request.trip.travelWindow;
  const nights = nightsBetween(intake?.departureDate ?? "", intake?.returnDate ?? "");
  const travelersLabel = formatRequestParty(request);
  const route = departureCity ? `${departureCity} → ${destination}` : destination;
  const wantsFlight = hasMode(intake?.transportationModes, "flight");
  const wantsRental = hasMode(intake?.transportationModes, "rental");
  const copy = stayCopy(tripType);
  const occasionKind =
    tripType === "cruise"
      ? "cruise"
      : typeLabel && typeLabel !== "Not sure yet"
        ? typeLabel.toLowerCase()
        : "getaway";
  const agentNotes = [
    intake?.notes || request.trip.preferences
      ? `Traveler notes: ${intake?.notes || request.trip.preferences}`
      : "",
    request.trip.budget ? `Budget guidance: ${request.trip.budget}` : "",
    intake?.preferredAgent || request.trip.preferredAgent
      ? `Preferred agent: ${intake?.preferredAgent || request.trip.preferredAgent}`
      : "",
    intake?.accessibilityNeeded
      ? `Accessibility: ${[intake.accessibilityNeeded, intake.accessibilityNotes]
          .filter(Boolean)
          .join(" — ")}`
      : "",
    intake?.adultDobs?.some(Boolean)
      ? `Adult DOBs on file: ${formatDobList(intake.adultDobs)}`
      : request.trip.adultAges?.length
        ? `Adult ages: ${formatAgeList(request.trip.adultAges)}`
        : "",
    intake?.childDobs?.some(Boolean)
      ? `Child DOBs on file: ${formatDobList(intake.childDobs)}`
      : request.trip.childAges?.length
        ? `Child ages (17 and under): ${formatAgeList(request.trip.childAges)}`
        : "",
    request.trip.tripStyle.length
      ? `Requested trip style: ${request.trip.tripStyle.join(", ")}`
      : "",
    wantsFlight
      ? "Traveler asked for flights. Put the fare on the Flight line."
      : "",
    wantsRental
      ? "Traveler asked for a rental car. Put it on the Transportation line."
      : "",
  ].filter(Boolean);
  const notes = [
    "Prices and availability are confirmed before booking. No confirmation numbers until we book.",
    "We recommend travel protection so an unexpected change does not become an unpaid trip.",
  ];

  return {
    id: createId("quote"),
    createdAt: new Date().toISOString(),
    occasionTitle: `${first}'s ${destination} ${occasionKind}`,
    destinationLabel: destination,
    dates,
    nights,
    travelersLabel,
    route,
    resortName: "",
    resortRating: "",
    resortAddress: destination,
    roomType: copy.roomLabel,
    roomDetails: "",
    resortImageUrl: "",
    amenities: [],
    investmentLines: [
      { label: packagePriceLabel(tripType), amount: "" },
      { label: PRICE_LINE_FLIGHT, amount: "" },
      { label: PRICE_LINE_TRANSPORT, amount: "" },
      { label: PRICE_LINE_SPECIAL, amount: "" },
    ],
    investmentTotal: "",
    cancellation: "",
    includeFlights: false,
    flightRoute: "",
    flightTiers: [],
    recommendedFlightId: "",
    recommendedFlightTotal: "",
    enhancements: [],
    includeProtection: false,
    protectionProvider: "",
    protectionTiers: [
      {
        id: createId("tier"),
        name: "OneTrip Prime",
        price: "",
        popular: true,
        features: ["Trip cancellation", "Trip interruption", "Emergency medical"],
      },
      {
        id: createId("tier"),
        name: "Premier",
        price: "",
        features: ["Higher medical limits", "Cancel for any reason available"],
      },
    ],
    protectionUpgrade: "",
    agentNotes,
    notes,
    thankYou: `Thank you for letting Amore Global help plan this trip. We will stay with you from this quote through confirmation.`,
    flyerUrl: "",
    quoteKind: "full",
  };
}

export function emptyFlyerProposal(request: TravelRequest): TravelProposal {
  const base = emptyProposal(request);
  return {
    ...base,
    resortName: "",
    roomType: "",
    roomDetails: "",
    amenities: [],
    investmentLines: [],
    includeFlights: false,
    flightTiers: [],
    enhancements: [],
    includeProtection: false,
    quoteKind: "media",
  };
}

function needsPrefill(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return (
    !normalized ||
    normalized === "tbd" ||
    normalized === "unknown" ||
    normalized === "quoted on request" ||
    normalized === "to be confirmed"
  );
}

function fillIfNeeded(value: string | undefined, fallback: string) {
  return needsPrefill(value) ? fallback : value ?? "";
}

function mergeTiers(
  current: QuoteTier[],
  incoming: QuoteTier[],
) {
  if (current.length === 0) return incoming;
  return current.map((tier, index) => {
    const fallback = incoming[index];
    if (!fallback) return tier;
    return {
      ...tier,
      name: fillIfNeeded(tier.name, fallback.name),
      features: tier.features.some((item) => item.trim())
        ? tier.features
        : fallback.features,
    };
  });
}

/**
 * Refresh a draft with what the traveler has supplied while deliberately
 * preserving the agent's entered suppliers, prices, choices, and copy.
 */
export function mergeTravelerDetailsIntoProposal(
  proposal: TravelProposal,
  request: TravelRequest,
): TravelProposal {
  const prefilled = emptyProposal(request);
  const currentLines = proposal.investmentLines.length
    ? proposal.investmentLines
    : prefilled.investmentLines;
  const investmentLines = currentLines.map((line, index) => ({
    ...line,
    label: fillIfNeeded(line.label, prefilled.investmentLines[index]?.label ?? ""),
  }));
  const travelerNotes = [...(proposal.notes ?? [])];
  for (const note of prefilled.notes) {
    if (!travelerNotes.includes(note)) travelerNotes.push(note);
  }
  const agentNotes = [...(proposal.agentNotes ?? [])];
  for (const note of prefilled.agentNotes ?? []) {
    if (!agentNotes.includes(note)) agentNotes.push(note);
  }

  return {
    ...proposal,
    occasionTitle: fillIfNeeded(proposal.occasionTitle, prefilled.occasionTitle),
    destinationLabel: fillIfNeeded(proposal.destinationLabel, prefilled.destinationLabel),
    dates: fillIfNeeded(proposal.dates, prefilled.dates),
    nights: fillIfNeeded(proposal.nights, prefilled.nights),
    travelersLabel: fillIfNeeded(proposal.travelersLabel, prefilled.travelersLabel),
    route: fillIfNeeded(proposal.route, prefilled.route),
    resortAddress: fillIfNeeded(proposal.resortAddress, prefilled.resortAddress),
    roomType: fillIfNeeded(proposal.roomType, prefilled.roomType),
    roomDetails: fillIfNeeded(proposal.roomDetails, prefilled.roomDetails),
    amenities: proposal.amenities.length ? proposal.amenities : prefilled.amenities,
    investmentLines,
    includeFlights: proposal.includeFlights,
    flightRoute: fillIfNeeded(proposal.flightRoute, prefilled.flightRoute),
    flightTiers: mergeTiers(proposal.flightTiers, prefilled.flightTiers),
    recommendedFlightId:
      proposal.recommendedFlightId ||
      prefilled.recommendedFlightId ||
      proposal.flightTiers[0]?.id ||
      "",
    enhancements: proposal.enhancements.length
      ? proposal.enhancements
      : prefilled.enhancements,
    agentNotes,
    notes: travelerNotes,
  };
}

export function proposalFromFlyer(
  request: TravelRequest,
  input: {
    title: string;
    summary: string;
    estimatedPrice: string;
    highlights?: string[];
    flyerUrl?: string;
  },
): TravelProposal {
  const base = emptyProposal(request);
  const flyerUrl = input.flyerUrl?.trim() || "";
  const isPdf = /\.pdf($|\?)/i.test(flyerUrl);
  return {
    ...base,
    occasionTitle: input.title.trim() || base.occasionTitle,
    investmentTotal: input.estimatedPrice.trim(),
    notes: [
      input.summary.trim(),
      ...(input.highlights ?? []).map((line) => line.trim()).filter(Boolean),
      ...base.notes,
    ].filter(Boolean),
    flyerUrl: flyerUrl || undefined,
    pdfUrl: isPdf ? flyerUrl : base.pdfUrl,
  };
}

export function proposalFromOption(request: TravelRequest, option: TravelOption): TravelProposal {
  return {
    ...proposalFromFlyer(request, {
      title: option.title,
      summary: option.summary,
      estimatedPrice: option.estimatedPrice,
      highlights: option.highlights,
      flyerUrl: option.flyerUrl,
    }),
    id: option.id,
    createdAt: option.createdAt,
  };
}

export function recommendedFlight(quote: TravelProposal) {
  return (
    quote.flightTiers.find((tier) => tier.id === quote.recommendedFlightId) ??
    quote.flightTiers.find((tier) => tier.popular) ??
    quote.flightTiers[0]
  );
}
