import type { ResearchEvidence } from "@/lib/quote-research";

export type RequestStatus =
  | "submitted"
  | "under_review"
  | "options_ready"
  | "option_selected"
  | "booking_confirmed";

export type PaymentStatus =
  | "not_requested"
  | "paid"
  | "refunded";

export type PaymentPlanType =
  | "none"
  | "pay_in_full"
  | "deposit_and_balance"
  | "installments"
  | "custom";

export type InstallmentStatus =
  | "scheduled"
  | "paid"
  | "overdue"
  | "waived";

export type InstallmentPayment = {
  id: string;
  label: string;
  /** ISO date YYYY-MM-DD */
  dueDate: string;
  amount: string;
  status: InstallmentStatus;
  /** ISO date YYYY-MM-DD when this installment was received */
  paidAt?: string;
  note?: string;
};

export type TripType =
  | "cruise"
  | "all_inclusive"
  | "vacation_package"
  | "not_sure";

export type MessageSender = "traveler" | "agent";

export type TravelOption = {
  id: string;
  title: string;
  summary: string;
  estimatedPrice: string;
  highlights: string[];
  flyerUrl?: string;
  createdAt: string;
};

export type QuoteLine = {
  label: string;
  amount: string;
  note?: string;
};

export type QuoteTier = {
  id: string;
  name: string;
  price: string;
  popular?: boolean;
  features: string[];
};

export type QuoteEnhancement = {
  name: string;
  price: string;
  note?: string;
};

export type TravelProposal = {
  id: string;
  createdAt: string;
  occasionTitle: string;
  destinationLabel: string;
  dates: string;
  nights: string;
  travelersLabel: string;
  route: string;
  resortName: string;
  resortRating: string;
  resortAddress: string;
  roomType: string;
  roomDetails: string;
  resortImageUrl: string;
  amenities: string[];
  investmentLines: QuoteLine[];
  investmentTotal: string;
  cancellation: string;
  includeFlights: boolean;
  flightRoute: string;
  flightTiers: QuoteTier[];
  recommendedFlightId: string;
  recommendedFlightTotal: string;
  enhancements: QuoteEnhancement[];
  includeProtection: boolean;
  protectionProvider: string;
  protectionTiers: QuoteTier[];
  protectionUpgrade: string;
  /** Internal traveler context used to prepare the quote; never rendered in QuoteDocument. */
  agentNotes?: string[];
  notes: string[];
  thankYou: string;
  /** Agent-recorded research; unapproved observations never become published facts. */
  researchEvidence?: ResearchEvidence[];
  flyerUrl?: string;
  pdfUrl?: string;
};

export type MessageAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
};

export type Message = {
  id: string;
  sender: MessageSender;
  senderName: string;
  body: string;
  createdAt: string;
  attachments?: MessageAttachment[];
};

export type TripIntake = {
  completedAt: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  preferredContactMethods: string[];
  destination: string;
  transportationModes: string[];
  departureDate: string;
  returnDate: string;
  notes: string;
  accessibilityNeeded: string;
  accessibilityNotes: string;
  adultsCount: string;
  adultsAges?: string;
  adultDobs: string[];
  childrenCount: string;
  childrenAges?: string;
  childDobs: string[];
  pets: boolean;
  supportAnimal: boolean;
  preferredAgent: string;
  tripType: TripType;
};

export type TravelRequest = {
  id: string;
  /** Human trip reference for agents (not used as traveler login). */
  tripRef: string;
  /** @deprecated legacy field; migrated into tripRef */
  accessCode?: string;
  status: RequestStatus;
  progressStatus?: RequestStatus;
  paymentStatus: PaymentStatus;
  /**
   * Whether a multi-date installment-style plan is active.
   * Kept in sync with paymentPlanType for older UI / CSV.
   */
  installmentPlanActive: boolean;
  /** How the traveler is paying (full, deposit+balance, installments, custom). */
  paymentPlanType: PaymentPlanType;
  /** Ordered payment dates for installment-style plans. */
  paymentSchedule: InstallmentPayment[];
  /** Confirmation, reference, or other payment metadata. */
  paymentNote: string;
  /** ISO date (YYYY-MM-DD) when payment was received. */
  paidAt?: string;
  /** ISO date (YYYY-MM-DD) when a refund was issued. */
  refundedAt?: string;
  /** Optional ClientEase booking id; one-way CSV only — no ClientEase API. */
  clienteaseRef?: string | null;
  /** The current owner in the shared agent queue. */
  assignedAgentId: string;
  createdAt: string;
  updatedAt: string;
  traveler: {
    fullName: string;
    email: string;
    phone: string;
  };
  trip: {
    destination: string;
    departureCity: string;
    travelWindow: string;
    travelers: number;
    /** Adults 18+ on the initial quote request. */
    adultsCount?: number;
    /** Children 17 and under on the initial quote request. */
    childrenCount?: number;
    adultAges?: number[];
    childAges?: number[];
    budget: string;
    tripType: TripType;
    tripStyle: string[];
    preferences: string;
    preferredAgent: string;
  };
  /** Expanded questionnaire. Optional until a quote is approved. */
  intake?: TripIntake;
  selectedOptionId?: string;
  selectedQuoteId?: string;
  options: TravelOption[];
  quotes: TravelProposal[];
  messages: Message[];
};

export type NotificationEvent =
  | "request_submitted"
  | "status_updated"
  | "options_ready"
  | "option_selected"
  | "message_from_traveler"
  | "message_from_agent"
  | "intake_completed";

export type DemoNotification = {
  id: string;
  createdAt: string;
  event: NotificationEvent | "system";
  to: string;
  subject: string;
  text: string;
  requestId?: string;
};
