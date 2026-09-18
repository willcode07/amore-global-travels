import assert from "node:assert/strict";
import test from "node:test";
import {
  formatInternationalPhone,
  parseStoredPhone,
  validatePhoneParts,
  validateStoredPhone,
} from "@/lib/phone";
import { formatRequestParty, validateQuotePartyAges } from "@/lib/intake";
import { applyCreate, applyMessage, applyUpdate } from "@/lib/request-ops";
import type { ResearchEvidence } from "@/lib/quote-research";
import type { TravelProposal } from "@/lib/types";

const approvedStay: ResearchEvidence = {
  id: "research_stay",
  kind: "stay",
  supplier: "Example Resort",
  description: "Ocean-view room for two travelers",
  amount: "$1,250.00",
  currency: "USD",
  priceBasis: "Total party",
  terms: "Refundable until 30 days before arrival.",
  sourceUrl: "https://example.com/resort",
  observedAt: "2027-05-01",
  status: "approved",
};

function publishableQuote(): TravelProposal {
  return {
    id: "quote_1",
    createdAt: "2027-01-01T00:00:00.000Z",
    occasionTitle: "Ava's beach escape",
    destinationLabel: "Aruba",
    dates: "Jun 4, 2027 – Jun 9, 2027",
    nights: "5 nights",
    travelersLabel: "2 adults",
    route: "Atlanta → Aruba",
    resortName: "Example Resort",
    resortRating: "4.5",
    resortAddress: "Palm Beach, Aruba",
    roomType: "Ocean-view king",
    roomDetails: "King room with balcony",
    resortImageUrl: "https://example.com/image.jpg",
    amenities: ["Beachfront access"],
    investmentLines: [
      { label: "Stay", amount: "$1,000.00" },
      { label: "Taxes", amount: "$250.00" },
    ],
    investmentTotal: "$1,250.00",
    cancellation: "Refundable until May 5",
    includeFlights: false,
    flightRoute: "",
    flightTiers: [],
    recommendedFlightId: "",
    recommendedFlightTotal: "",
    enhancements: [],
    includeProtection: false,
    protectionProvider: "",
    protectionTiers: [],
    protectionUpgrade: "",
    notes: ["All availability is rechecked before booking."],
    thankYou: "Thank you for planning with Amore Global.",
    researchEvidence: [approvedStay],
  };
}

test("US phone numbers require a 10-digit national number and keep the country code", () => {
  assert.equal(validatePhoneParts("US", "4045550101"), "");
  assert.ok(validatePhoneParts("US", "404555"));
  assert.equal(formatInternationalPhone("US", "404-555-0101"), "+1 4045550101");
  assert.equal(parseStoredPhone("+1 4045550101").countryId, "US");
  assert.equal(parseStoredPhone("8765550101").countryId, "JM");
  assert.equal(validateStoredPhone("+233 241234567"), "");
});

test("quote requests store adult and child ages without trip details", () => {
  const request = applyCreate({
    fullName: "William Johnson",
    email: "william@example.com",
    phone: "+1 4045550199",
    destination: "Peru",
    travelWindow: "Dec 28, 2026 – Jan 8, 2027",
    adultsCount: 2,
    childrenCount: 1,
    adultAges: [42, 68],
    childAges: [9],
  });

  assert.equal(request.status, "submitted");
  assert.equal(request.intake, undefined);
  assert.equal(request.trip.adultsCount, 2);
  assert.equal(request.trip.childrenCount, 1);
  assert.deepEqual(request.trip.adultAges, [42, 68]);
  assert.deepEqual(request.trip.childAges, [9]);
  assert.equal(request.trip.travelers, 3);
  assert.match(formatRequestParty(request), /Adults 2 — 42, 68/);
  assert.match(formatRequestParty(request), /Children 17 and under 1 — 9/);
  assert.match(request.messages[0]?.body ?? "", /usually within 24 hours/i);
  assert.doesNotMatch(request.messages[0]?.body ?? "", /complete your trip details/i);
});

test("children 17 and under cannot be listed as adults on the quote request", () => {
  const errors = validateQuotePartyAges({
    adultsCount: 1,
    childrenCount: 1,
    adultAges: [16],
    childAges: [18],
  });
  assert.ok(errors.some((message) => /Adult 1/.test(message)));
  assert.ok(errors.some((message) => /Child 1/.test(message)));
});

test("agents can publish a quote before trip details are submitted", () => {
  const request = applyCreate({
    fullName: "Ava Traveler",
    email: "ava@example.com",
    phone: "+1 4045550101",
    destination: "Aruba",
    travelWindow: "Jun 4 – Jun 9",
    adultsCount: 2,
    adultAges: [34, 36],
  });
  const updated = applyUpdate(request, {
    quote: {
      ...publishableQuote(),
      id: "quote_publish_without_intake",
    },
  });
  assert.equal(updated.quotes.length, 1);
  assert.equal(updated.status, "options_ready");
});

test("messages can include a flyer attachment without a text body", () => {
  const request = applyCreate({
    fullName: "Ava Traveler",
    email: "ava@example.com",
    phone: "+1 4045550101",
    destination: "Aruba",
    travelWindow: "Jun 4 – Jun 9",
  });
  const updated = applyMessage(request, {
    sender: "agent",
    body: "",
    attachments: [
      {
        id: "att_1",
        name: "caribbean-flyer.pdf",
        url: "https://example.com/caribbean-flyer.pdf",
        mimeType: "application/pdf",
      },
    ],
  });
  const message = updated.messages.at(-1);
  assert.equal(message?.attachments?.length, 1);
  assert.equal(message?.attachments?.[0]?.name, "caribbean-flyer.pdf");
  assert.match(message?.body ?? "", /Shared a file/i);
});
