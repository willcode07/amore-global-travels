import type { TravelRequest, TripIntake, TripType } from "@/lib/types";

export const sampleRequestIds = [
  "sample-william-johnson-mexico-city",
  "sample-shonya-morrison-jamaica",
  "sample-alfreda-gibson-ghana",
] as const;

type SampleRequestInput = {
  id: (typeof sampleRequestIds)[number];
  tripRef: string;
  fullName: string;
  email: string;
  phone: string;
  destination: string;
  departureCity: string;
  departureDate: string;
  returnDate: string;
  adults: string[];
  tripType: TripType;
  transport: string[];
  preferredAgent: string;
  assignedAgentId: string;
  budget: string;
  preferences: string;
};

function travelWindow(departureDate: string, returnDate: string) {
  return `${departureDate} – ${returnDate}`;
}

function sampleIntake(input: SampleRequestInput): TripIntake {
  const [firstName, ...lastName] = input.fullName.split(" ");
  return {
    completedAt: "2026-09-15T12:00:00.000Z",
    firstName,
    lastName: lastName.join(" "),
    address1: "100 Demo Travel Lane",
    address2: "",
    city: input.departureCity,
    state: "GA",
    zip: "30303",
    phone: input.phone,
    email: input.email,
    preferredContactMethods: ["Email"],
    destination: input.destination,
    transportationModes: input.transport,
    departureDate: input.departureDate,
    returnDate: input.returnDate,
    notes: input.preferences,
    accessibilityNeeded: "",
    accessibilityNotes: "",
    adultsCount: String(input.adults.length),
    adultDobs: input.adults,
    adultNames: input.adults.map((_, index) => (index === 0 ? input.fullName : "")),
    childrenCount: "0",
    childDobs: [],
    childNames: [],
    pets: false,
    supportAnimal: false,
    preferredAgent: input.preferredAgent,
    tripType: input.tripType,
  };
}

function sampleRequest(input: SampleRequestInput): TravelRequest {
  const intake = sampleIntake(input);
  const createdAt = "2026-09-15T12:00:00.000Z";
  return {
    id: input.id,
    tripRef: input.tripRef,
    status: "submitted",
    progressStatus: "submitted",
    paymentStatus: "not_requested",
    installmentPlanActive: false,
    paymentPlanType: "none",
    paymentSchedule: [],
    paymentNote: "",
    assignedAgentId: input.assignedAgentId,
    createdAt,
    updatedAt: createdAt,
    traveler: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
    },
    trip: {
      destination: input.destination,
      departureCity: input.departureCity,
      travelWindow: travelWindow(input.departureDate, input.returnDate),
      travelers: input.adults.length,
      budget: input.budget,
      tripType: input.tripType,
      tripStyle: input.tripType === "all_inclusive" ? ["All-inclusive"] : ["Hotel / resort"],
      preferences: input.preferences,
      preferredAgent: input.preferredAgent,
    },
    intake,
    options: [],
    quotes: [],
    messages: [
      {
        id: `${input.id}-message`,
        sender: "traveler",
        senderName: input.fullName,
        body: "This is a persistent demo request for agent quote QA.",
        createdAt,
      },
    ],
  };
}

/**
 * Local-only fixtures for the Agent Portal. They contain no supplier rates or
 * bookable inventory and are deliberately seeded as requests, not sent quotes.
 */
export function persistentSampleRequests(): TravelRequest[] {
  return [
    sampleRequest({
      id: "sample-william-johnson-mexico-city",
      tripRef: "SAMPLE-MEX-01",
      fullName: "William Johnson",
      email: "william.johnson.demo@example.com",
      phone: "404-555-0101",
      destination: "Mexico City",
      departureCity: "Atlanta",
      departureDate: "2027-03-14",
      returnDate: "2027-03-19",
      adults: ["1984-06-12", "1986-09-28"],
      tripType: "vacation_package",
      transport: ["Flight"],
      preferredAgent: "Shonya Morrison",
      assignedAgentId: "shonya",
      budget: "$1,500 – $3,000 per person",
      preferences: "Food, culture, and a centrally located hotel.",
    }),
    sampleRequest({
      id: "sample-shonya-morrison-jamaica",
      tripRef: "SAMPLE-JAM-02",
      fullName: "Shonya Morrison",
      email: "shonya.morrison.demo@example.com",
      phone: "404-555-0102",
      destination: "Jamaica",
      departureCity: "Atlanta",
      departureDate: "2027-05-08",
      returnDate: "2027-05-13",
      adults: ["1988-02-17", "1989-10-04"],
      tripType: "all_inclusive",
      transport: ["Flight"],
      preferredAgent: "Shonya Morrison",
      assignedAgentId: "shonya",
      budget: "$3,000 – $5,000 per person",
      preferences: "Adults-only beachfront all-inclusive with spa time.",
    }),
    sampleRequest({
      id: "sample-alfreda-gibson-ghana",
      tripRef: "SAMPLE-GHA-03",
      fullName: "Alfreda Gibson",
      email: "alfreda.gibson.demo@example.com",
      phone: "404-555-0103",
      destination: "Ghana",
      departureCity: "Atlanta",
      departureDate: "2027-08-02",
      returnDate: "2027-08-10",
      adults: ["1979-11-22", "1981-04-15"],
      tripType: "vacation_package",
      transport: ["Flight", "Rental Car"],
      preferredAgent: "Alfreda Gibson",
      assignedAgentId: "alfreda",
      budget: "Flexible / not sure yet",
      preferences: "Heritage sites, family connections, and accessible transfers.",
    }),
  ];
}
