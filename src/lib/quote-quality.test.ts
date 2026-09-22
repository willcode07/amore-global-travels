import assert from "node:assert/strict";
import test from "node:test";
import { evaluateQuoteQuality, parseMoney } from "@/lib/quote-quality";
import { emptyProposal, mergeTravelerDetailsIntoProposal } from "@/lib/quotes";
import { applyCreate, applyUpdate } from "@/lib/request-ops";
import {
  agentAssignmentNotifications,
  clearAgentAssignmentNotifications,
  readAgentAssignmentNotifications,
  recordAgentAssignment,
} from "@/lib/notifications";
import { readRequests } from "@/lib/store";
import type { ResearchEvidence } from "@/lib/quote-research";
import type { TravelProposal, TravelRequest } from "@/lib/types";

const approvedStayEvidence: ResearchEvidence = {
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

const approvedFlightEvidence: ResearchEvidence = {
  ...approvedStayEvidence,
  id: "research_flight",
  kind: "flight",
  supplier: "Example Air",
  description: "Main cabin, Atlanta to Aruba",
  amount: "$480.00",
  sourceUrl: "https://example.com/flights",
};

function readyQuote(overrides: Partial<TravelProposal> = {}): TravelProposal {
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
    researchEvidence: [approvedStayEvidence],
    ...overrides,
  };
}

test("parseMoney supports common currency formats and rejects placeholders", () => {
  assert.equal(parseMoney("$3,743.15"), 3743.15);
  assert.equal(parseMoney("USD 3,743.15"), 3743.15);
  assert.equal(parseMoney("3743.15"), 3743.15);
  assert.equal(parseMoney("Quoted on request"), null);
  assert.equal(parseMoney("not a price"), null);
});

test("quality check reconciles investment totals with a safe calculated fix", () => {
  const result = evaluateQuoteQuality(
    readyQuote({ investmentTotal: "$1,100.00" }),
  );

  assert.equal(result.canPublish, false);
  assert.ok(result.errors.some((item) => item.code === "investment-total-mismatch"));
  assert.deepEqual(result.autoFixes[0]?.patch, { investmentTotal: "$1,250.00" });
});

test("quality check catches missing traveler-facing quote details", () => {
  const result = evaluateQuoteQuality(
    readyQuote({
      destinationLabel: "",
      resortName: "",
      flyerUrl: "",
      researchEvidence: [],
    }),
  );

  assert.equal(result.canPublish, false);
  assert.ok(result.errors.some((item) => item.code === "destinationLabel-required"));
  assert.ok(result.errors.some((item) => item.code === "property-or-flyer-required"));
  assert.equal(
    result.errors.some((item) => item.code === "stay-research-required"),
    false,
  );
});

test("media-only quotes still need an entered traveler total", () => {
  const result = evaluateQuoteQuality(
    readyQuote({
      resortName: "",
      flyerUrl: "https://example.com/flyer.pdf",
      investmentLines: [],
      investmentTotal: "",
      researchEvidence: [],
    }),
  );

  assert.equal(result.canPublish, false);
  assert.ok(result.errors.some((item) => item.code === "flyer-total-required"));
});

test("quality check rejects unapproved research evidence", () => {
  const result = evaluateQuoteQuality(
    readyQuote({
      recordResearch: true,
      researchEvidence: [{ ...approvedStayEvidence, status: "unverified" }],
    }),
  );

  assert.equal(result.canPublish, false);
  assert.ok(result.errors.some((item) => item.code === "research-approval-required"));
});

test("quality check blocks flight options with placeholder details", () => {
  const result = evaluateQuoteQuality(
    readyQuote({
      includeFlights: true,
      flightRoute: "Atlanta → Aruba",
      flightTiers: [
        {
          id: "tier_main",
          name: "Main cabin",
          price: "$480.00",
          features: ["Airline TBD", "Times TBD"],
        },
      ],
      recommendedFlightId: "tier_main",
      recommendedFlightTotal: "$480.00",
      researchEvidence: [approvedStayEvidence, approvedFlightEvidence],
    }),
  );

  assert.equal(result.canPublish, false);
  assert.ok(result.errors.some((item) => item.code === "flight-tier-details-required"));
});

test("incomplete quotes can be sent without a quality-check gate", () => {
  const updated = applyUpdate(requestFixture(), {
    quote: readyQuote({ investmentTotal: "", resortName: "" }),
  });
  assert.equal(updated.quotes.length, 1);
  assert.equal(updated.quotes[0]?.resortName, "");
});

test("a checked media quote is stored as a normal traveler quote", () => {
  const mediaQuote = readyQuote({
    resortName: "",
    flyerUrl: "https://example.com/flyer.pdf",
    investmentLines: [],
    researchEvidence: [],
  });

  const updated = applyUpdate(requestFixture(), { quote: mediaQuote });
  assert.equal(updated.quotes.length, 1);
  assert.equal(updated.quotes[0]?.flyerUrl, mediaQuote.flyerUrl);
  assert.equal(updated.status, "options_ready");
  assert.equal(updated.messages.length, 1);
  assert.match(updated.messages[0]?.body ?? "", /quote is ready to review/i);

  const revised = applyUpdate(updated, {
    quote: { ...mediaQuote, occasionTitle: "Updated flyer quote" },
  });
  assert.equal(revised.messages.length, 1);
});

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function requestFixture(): TravelRequest {
  return {
    id: "req_1",
    tripRef: "AVA-0001-AA",
    status: "submitted",
    progressStatus: "submitted",
    paymentStatus: "not_requested",
    installmentPlanActive: false,
    paymentPlanType: "none",
    paymentSchedule: [],
    assignedAgentId: "shonya",
    paymentNote: "",
    createdAt: "2027-01-01T00:00:00.000Z",
    updatedAt: "2027-01-01T00:00:00.000Z",
    traveler: {
      fullName: "Ava Traveler",
      email: "ava@example.com",
      phone: "4045550101",
    },
    trip: {
      destination: "Aruba",
      departureCity: "Atlanta",
      travelWindow: "Jun 4, 2027 – Jun 9, 2027",
      travelers: 2,
      budget: "",
      tripType: "vacation_package",
      tripStyle: [],
      preferences: "",
      preferredAgent: "",
    },
    options: [],
    quotes: [],
    messages: [],
  };
}

test("selecting a quote adds one traveler message for the agent", () => {
  const quote = readyQuote();
  const request = { ...requestFixture(), quotes: [quote] };

  const selected = applyUpdate(request, { selectedQuoteId: quote.id });
  const message = selected.messages.at(-1);
  assert.equal(selected.status, "option_selected");
  assert.equal(message?.sender, "traveler");
  assert.match(message?.body ?? "", /I selected Ava's beach escape/i);

  const repeated = applyUpdate(selected, { selectedQuoteId: quote.id });
  assert.equal(repeated.messages.length, selected.messages.length);
});

test("confirming a trip adds one agent message for the traveler", () => {
  const confirmed = applyUpdate(requestFixture(), {
    paymentStatus: "paid",
    status: "booking_confirmed",
  });
  const message = confirmed.messages.at(-1);
  assert.equal(message?.sender, "agent");
  assert.match(message?.body ?? "", /trip has been confirmed/i);

  const repeated = applyUpdate(confirmed, { status: "booking_confirmed" });
  assert.equal(repeated.messages.length, confirmed.messages.length);
});

test("Load Traveller details fills blanks without overwriting agent choices", () => {
  const request = {
    ...requestFixture(),
    trip: {
      ...requestFixture().trip,
      budget: "Under $1,500 per person",
    },
  };
  const draft = emptyProposal(request);
  const merged = mergeTravelerDetailsIntoProposal(
    {
      ...draft,
      destinationLabel: "",
      route: "",
      resortName: "Agent-selected resort",
      investmentTotal: "$1,999.00",
      notes: ["Agent note"],
    },
    request,
  );

  assert.equal(merged.destinationLabel, "Aruba");
  assert.equal(merged.route, "Atlanta → Aruba");
  assert.equal(merged.resortName, "Agent-selected resort");
  assert.equal(merged.investmentTotal, "$1,999.00");
  assert.ok(merged.notes.includes("Agent note"));
  assert.ok(
    merged.agentNotes?.some((note) => note.startsWith("Budget guidance: Under $1,500")),
  );
});

test("legacy installment-plan payment statuses migrate to an independent flag", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });

  try {
    const legacy = {
      ...requestFixture(),
      paymentStatus: "deposit_due",
    };
    storage.setItem(
      "amore_travel_requests",
      JSON.stringify({ requests: [legacy] }),
    );

    const migrated = readRequests()[0];
    assert.equal(migrated.paymentStatus, "not_requested");
    assert.equal(migrated.installmentPlanActive, true);
    assert.equal(migrated.paymentPlanType, "installments");
    assert.equal(migrated.assignedAgentId, "shonya");

    const persisted = JSON.parse(storage.getItem("amore_travel_requests") ?? "{}");
    assert.equal(persisted.requests[0].paymentStatus, "not_requested");
    assert.equal(persisted.requests[0].installmentPlanActive, true);
    assert.equal(persisted.requests[0].paymentPlanType, "installments");
  } finally {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});

test("installment payment plans store plan type and multiple due dates", () => {
  const updated = applyUpdate(requestFixture(), {
    paymentPlanType: "installments",
    paymentSchedule: [
      {
        id: "pay_1",
        label: "Deposit",
        dueDate: "2027-03-01",
        amount: "$400",
        status: "paid",
        paidAt: "2027-02-20",
      },
      {
        id: "pay_2",
        label: "Second payment",
        dueDate: "2027-04-01",
        amount: "$400",
        status: "scheduled",
      },
      {
        id: "pay_3",
        label: "Final payment",
        dueDate: "2027-05-01",
        amount: "$400",
        status: "scheduled",
      },
    ],
  });

  assert.equal(updated.paymentPlanType, "installments");
  assert.equal(updated.installmentPlanActive, true);
  assert.equal(updated.paymentSchedule.length, 3);
  assert.equal(updated.paymentSchedule[0]?.dueDate, "2027-03-01");
  assert.equal(updated.paymentSchedule[2]?.label, "Final payment");

  const cleared = applyUpdate(updated, { paymentPlanType: "pay_in_full" });
  assert.equal(cleared.paymentPlanType, "pay_in_full");
  assert.equal(cleared.installmentPlanActive, false);
  assert.equal(cleared.paymentSchedule.length, 0);
});

test("three persistent QA sample travel quotes seed without duplication", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });

  try {
    const firstRead = readRequests();
    const secondRead = readRequests();
    const labels = firstRead.map(
      (request) => `${request.traveler.fullName} to ${request.trip.destination}`,
    );

    assert.deepEqual(labels, [
      "William Johnson to Mexico City",
      "Shonya Morrison to Jamaica",
      "Alfreda Gibson to Ghana",
    ]);
    assert.equal(secondRead.length, 3);
  } finally {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});

test("requests use the preferred agent when available and default to Shonya", () => {
  const preferred = applyCreate({
    fullName: "Ava Traveler",
    email: "ava@example.com",
    phone: "4045550101",
    destination: "Aruba",
    travelWindow: "Jun 4 – Jun 9",
    preferredAgent: "Valerie Takpor",
  });
  const fallback = applyCreate({
    fullName: "No Preference",
    email: "none@example.com",
    phone: "4045550102",
    destination: "Aruba",
    travelWindow: "Jun 4 – Jun 9",
    preferredAgent: "Unknown Agent",
  });

  assert.equal(preferred.assignedAgentId, "valerie");
  assert.equal(fallback.assignedAgentId, "shonya");
});

test("stored owner names normalize to stable agent ids", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });

  try {
    storage.setItem(
      "amore_travel_requests",
      JSON.stringify({
        requests: [{ ...requestFixture(), assignedAgentId: "Valerie Takpor" }],
      }),
    );

    assert.equal(readRequests()[0]?.assignedAgentId, "valerie");
  } finally {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});

test("assignment notices are durable and marked read per portal identity", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });

  try {
    const request = { ...requestFixture(), assignedAgentId: "valerie" };
    recordAgentAssignment(request, "valerie");
    assert.equal(agentAssignmentNotifications("valerie").length, 1);
    assert.equal(readAgentAssignmentNotifications("valerie").length, 1);
    assert.equal(readAgentAssignmentNotifications("valerie").length, 0);
    clearAgentAssignmentNotifications("valerie");
    assert.equal(agentAssignmentNotifications("valerie").length, 0);
  } finally {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});

test("a short quote can publish without research when research is not toggled on", () => {
  const result = evaluateQuoteQuality(
    readyQuote({
      recordResearch: false,
      researchEvidence: [],
    }),
  );
  assert.equal(result.canPublish, true);
  assert.equal(result.errors.some((item) => item.code === "stay-research-required"), false);
});

test("empty quote drafts do not dump flights or TBD flight prices", () => {
  const request = {
    ...requestFixture(),
    intake: {
      completedAt: "2027-01-01T00:00:00.000Z",
      firstName: "Ava",
      lastName: "Traveler",
      address1: "",
      address2: "",
      city: "Atlanta",
      state: "",
      zip: "",
      phone: "4045550101",
      email: "ava@example.com",
      preferredContactMethods: [],
      destination: "Aruba",
      transportationModes: ["Flight"],
      departureDate: "2027-06-04",
      returnDate: "2027-06-09",
      notes: "",
      accessibilityNeeded: "",
      accessibilityNotes: "",
      adultsCount: "2",
      adultDobs: [],
      adultNames: [],
      childrenCount: "0",
      childDobs: [],
      childNames: [],
      pets: false,
      supportAnimal: false,
      preferredAgent: "",
      tripType: "vacation_package" as const,
    },
  };
  const draft = emptyProposal(request);
  assert.equal(draft.includeFlights, false);
  assert.equal(draft.flightTiers.length, 0);
  assert.equal(draft.amenities.length, 0);
  assert.equal(draft.enhancements.length, 0);
  assert.deepEqual(
    draft.investmentLines.map((line) => line.label),
    ["Travel Package", "Flight", "Transportation", "Special Requests"],
  );
});

test("Trip Confirmed is blocked until payment is paid or a plan is saved", () => {
  assert.throws(
    () => applyUpdate(requestFixture(), { status: "booking_confirmed" }),
    /payment plan/i,
  );
  const withPlan = applyUpdate(requestFixture(), {
    paymentPlanType: "pay_in_full",
    status: "booking_confirmed",
  });
  assert.equal(withPlan.status, "booking_confirmed");
});

test("replacing a published quote keeps the previous version and records who updated", () => {
  const published = applyUpdate(requestFixture(), { quote: readyQuote() });
  const revised = applyUpdate(published, {
    quote: { ...readyQuote(), occasionTitle: "Ava's revised escape" },
    audit: {
      agentId: "valerie",
      agentName: "Valerie Takpor",
      action: "quote",
      detail: "Ava's revised escape",
    },
  });
  assert.equal(revised.quotes[0]?.occasionTitle, "Ava's revised escape");
  assert.equal(revised.quoteHistory?.[0]?.occasionTitle, "Ava's beach escape");
  assert.equal(revised.lastUpdatedBy, "valerie");
  assert.equal(revised.auditLog?.[0]?.action, "quote");
});
