export type RequestStatus =
  | "submitted"
  | "under_review"
  | "options_ready"
  | "option_selected"
  | "booking_confirmed";

export type PaymentStatus =
  | "not_requested"
  | "deposit_due"
  | "paid"
  | "refunded";

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
  notes: string[];
  thankYou: string;
  flyerUrl?: string;
  pdfUrl?: string;
};

export type Message = {
  id: string;
  sender: MessageSender;
  senderName: string;
  body: string;
  createdAt: string;
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
  paymentNote: string;
  /** Optional ClientEase booking id; one-way CSV only — no ClientEase API. */
  clienteaseRef?: string | null;
  assignedAgentId?: string | null;
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
    budget: string;
    tripType: TripType;
    tripStyle: string[];
    preferences: string;
    preferredAgent: string;
  };
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
  | "message_from_agent";

export type DemoNotification = {
  id: string;
  createdAt: string;
  event: NotificationEvent | "system";
  to: string;
  subject: string;
  text: string;
  requestId?: string;
};
