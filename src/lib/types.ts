export type RequestStatus =
  | "submitted"
  | "under_review"
  | "options_ready"
  | "option_selected"
  | "booking_confirmed";

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

export type Message = {
  id: string;
  sender: MessageSender;
  senderName: string;
  body: string;
  createdAt: string;
};

export type TravelRequest = {
  id: string;
  accessCode: string;
  status: RequestStatus;
  /** Furthest step reached — preserved when reviewing earlier steps */
  progressStatus?: RequestStatus;
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
    tripStyle: string[];
    preferences: string;
    preferredAgent: string;
  };
  selectedOptionId?: string;
  options: TravelOption[];
  messages: Message[];
};

export type NotificationEvent =
  | "request_submitted"
  | "status_updated"
  | "options_ready"
  | "option_selected"
  | "message_from_traveler"
  | "message_from_agent";
