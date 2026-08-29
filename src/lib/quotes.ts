import { assetPath } from "@/lib/asset";
import { createId } from "@/lib/store";
import { TravelProposal, TravelRequest } from "@/lib/types";

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
];

export function emptyProposal(request: TravelRequest): TravelProposal {
  const first = request.traveler.fullName.split(" ")[0] || "Your";
  return {
    id: createId("quote"),
    createdAt: new Date().toISOString(),
    occasionTitle: `${first}'s getaway`,
    destinationLabel: request.trip.destination || "Your destination",
    dates: request.trip.travelWindow,
    nights: "",
    travelersLabel: `${request.trip.travelers} traveler${request.trip.travelers === 1 ? "" : "s"}`,
    route: request.trip.departureCity
      ? `${request.trip.departureCity} → ${request.trip.destination}`
      : request.trip.destination,
    resortName: "",
    resortRating: "4.5",
    resortAddress: "",
    roomType: "",
    roomDetails: "",
    resortImageUrl: assetPath("/images/caribbean.jpeg"),
    amenities: ["Beachfront access", "Swimming pool", "Free Wi-Fi"],
    investmentLines: [
      { label: "Room total", amount: "" },
      { label: "Average nightly rate", amount: "" },
      { label: "Taxes & fees", amount: "" },
      { label: "Property fee", amount: "" },
    ],
    investmentTotal: "",
    cancellation: "",
    includeFlights: true,
    flightRoute: "",
    flightTiers: [
      {
        id: createId("tier"),
        name: "Flex Plus",
        price: "",
        features: ["Two checked bags", "Fully modifiable", "Fully refundable"],
      },
      {
        id: createId("tier"),
        name: "Flex",
        price: "",
        popular: true,
        features: ["One checked bag", "Partially refundable"],
      },
      {
        id: createId("tier"),
        name: "Everyday",
        price: "",
        features: ["One checked bag", "Non-refundable"],
      },
    ],
    recommendedFlightId: "",
    recommendedFlightTotal: "",
    enhancements: [
      { name: "Resort transportation", price: "", note: "Per room, if needed" },
      {
        name: "Aura digital picture frame",
        price: "",
        note: "Keep the trip on the wall — partnership add-on",
      },
    ],
    includeProtection: true,
    protectionProvider: "Allianz Travel Insurance",
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
      {
        id: createId("tier"),
        name: "Basic",
        price: "",
        features: ["Core trip cancellation", "Emergency medical"],
      },
    ],
    protectionUpgrade: "",
    notes: [
      "Prices are quoted for this party and travel window. Your agent confirms availability before booking.",
      "We recommend travel protection so an unexpected change does not become an unpaid trip.",
    ],
    thankYou: `Thank you for letting Amore Global help plan this trip. We will stay with you from this quote through confirmation.`,
    flyerUrl: "",
  };
}

export function sampleProposal(request: TravelRequest): TravelProposal {
  const base = emptyProposal(request);
  const flexId = base.flightTiers[1]?.id ?? "";
  return {
    ...base,
    occasionTitle: `${request.traveler.fullName.split(" ")[0] || "Your"} celebration`,
    destinationLabel: `${request.trip.destination || "Belize"} luxury getaway`,
    dates: request.trip.travelWindow || "June 13 – June 18",
    nights: "5 nights",
    travelersLabel: `${request.trip.travelers || 6} adults`,
    route: "Belize City (BZE) → San Pedro (SPR)",
    resortName: "Royal Kahal Beach Resort",
    resortRating: "4.5",
    resortAddress: "San Pedro, Ambergris Caye, Belize",
    roomType: "Luxury penthouse — ocean view",
    roomDetails:
      "3 bedrooms · 1,850 sq. ft. · full kitchen · living & dining · private terrace",
    investmentLines: [
      { label: "Room total", amount: "$3,210.00" },
      { label: "Average nightly rate", amount: "$642.00" },
      { label: "Taxes & fees", amount: "$418.15" },
      { label: "Property fee", amount: "$115.00" },
    ],
    investmentTotal: "$3,743.15",
    cancellation: "Refundable before May 14",
    flightRoute: "BZE → SPR",
    flightTiers: base.flightTiers.map((tier, index) =>
      index === 0
        ? { ...tier, price: "$854.28", features: [...tier.features, "15% off tours"] }
        : index === 1
          ? { ...tier, price: "$725.28" }
          : { ...tier, price: "$632.64" },
    ),
    recommendedFlightId: flexId,
    recommendedFlightTotal: "$1,450.56",
    enhancements: [
      { name: "Resort transportation", price: "$12.50", note: "Per room" },
      { name: "Golf cart rental", price: "$380", note: "One week" },
      {
        name: "Aura digital picture frame",
        price: "Quoted on request",
        note: "Share trip photos with the whole party",
      },
    ],
    protectionTiers: base.protectionTiers.map((tier, index) =>
      index === 0
        ? { ...tier, price: "$393 total" }
        : index === 1
          ? { ...tier, price: "$620 total" }
          : { ...tier, price: "$272 total" },
    ),
    protectionUpgrade: "Cancel Anytime +$131",
    thankYou: `Thank you for allowing us to help plan this unforgettable trip.`,
  };
}

export function recommendedFlight(quote: TravelProposal) {
  return (
    quote.flightTiers.find((tier) => tier.id === quote.recommendedFlightId) ??
    quote.flightTiers.find((tier) => tier.popular) ??
    quote.flightTiers[0]
  );
}
