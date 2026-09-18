import { tripTypeLabels } from "@/lib/agents";
import { assetPath } from "@/lib/asset";
import {
  formatAgeList,
  formatDobList,
  formatRequestParty,
  formatTravelWindow,
  splitFullName,
} from "@/lib/intake";
import { createId } from "@/lib/store";
import {
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

function stayCopy(tripType: TripType) {
  if (tripType === "cruise") {
    return {
      roomLabel: "",
      roomDetails: "",
      amenities: ["Dining included", "Evening entertainment", "Wi-Fi available"],
      stayLine: "Cruise fare",
    };
  }
  if (tripType === "all_inclusive") {
    return {
      roomLabel: "",
      roomDetails: "",
      amenities: ["All-inclusive dining", "Swimming pool", "Free Wi-Fi"],
      stayLine: "Stay total",
    };
  }
  return {
    roomLabel: "",
    roomDetails: "",
    amenities: ["Free Wi-Fi", "Swimming pool", "Breakfast available"],
    stayLine: "Stay total",
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
  const includeFlights = wantsFlight;
  const copy = stayCopy(tripType);
  const occasionKind =
    tripType === "cruise"
      ? "cruise"
      : typeLabel && typeLabel !== "Not sure yet"
        ? typeLabel.toLowerCase()
        : "getaway";
  const flexId = createId("tier");
  const mainId = createId("tier");
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
    tripType === "cruise"
      ? "Cruise itinerary, ship, cabin, and sailing availability need agent verification."
      : "",
  ].filter(Boolean);
  const notes = [
    "Prices and availability are confirmed before booking. No confirmation numbers until we book.",
    "We recommend travel protection so an unexpected change does not become an unpaid trip.",
  ];

  const enhancements = wantsRental
    ? [
        {
          name: "Rental car",
          price: "TBD",
          note: "Requested with trip details",
        },
      ]
    : [];

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
    roomDetails: copy.roomDetails,
    resortImageUrl: assetPath("/images/caribbean.jpeg"),
    amenities: copy.amenities,
    investmentLines: [
      { label: copy.stayLine, amount: "" },
      { label: "Taxes & fees", amount: "" },
    ],
    investmentTotal: "",
    cancellation: "",
    includeFlights,
    flightRoute: includeFlights ? route : "",
    flightTiers: includeFlights
      ? [
          {
            id: mainId,
            name: "Main cabin",
            price: "TBD",
            features: ["Airline TBD", "Times TBD"],
          },
          {
            id: flexId,
            name: "Flexible",
            price: "TBD",
            popular: true,
            features: ["Airline TBD", "Times TBD", "More change flexibility"],
          },
        ]
      : [],
    recommendedFlightId: includeFlights ? flexId : "",
    recommendedFlightTotal: "",
    enhancements,
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
    researchEvidence: [],
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
