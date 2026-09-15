import { DemoNotification, TravelRequest } from "@/lib/types";

export type ActivityItem = {
  id: string;
  at: string;
  title: string;
};

function labelForNotification(note: DemoNotification) {
  if (note.event === "system") return "Signed in";
  if (note.event === "request_submitted") return "Confirmation email received";
  if (note.event === "options_ready") return "Email received · Quote ready";
  if (note.event === "message_from_agent") return "Email received · New message";
  if (note.event === "message_from_traveler") return "Email sent to your agent";
  if (note.event === "option_selected") return "Email sent · Option chosen";
  if (note.event === "intake_completed") return "Email sent · Trip details submitted";
  if (note.event === "status_updated") return "Email received · Trip update";
  return note.subject.replace(/^Your .+ sign-in code$/i, "Sign-in email received");
}

export function buildTripActivity(
  trip: TravelRequest,
  inbox: DemoNotification[],
): ActivityItem[] {
  const items: ActivityItem[] = [
    {
      id: `requested-${trip.id}`,
      at: trip.createdAt,
      title: "Quote requested",
    },
  ];

  if (trip.intake?.completedAt) {
    items.push({
      id: `intake-${trip.id}`,
      at: trip.intake.completedAt,
      title: "Trip details submitted",
    });
  }

  for (const note of inbox) {
    const forThisTrip = !note.requestId || note.requestId === trip.id;
    const accountEvent = note.event === "system";
    if (!forThisTrip && !accountEvent) continue;
    items.push({
      id: note.id,
      at: note.createdAt,
      title: labelForNotification(note),
    });
  }

  for (const quote of trip.quotes) {
    items.push({
      id: `quote-${quote.id}`,
      at: quote.createdAt,
      title: "Options ready to review",
    });
  }

  if (trip.selectedQuoteId || trip.selectedOptionId) {
    items.push({
      id: `chosen-${trip.id}`,
      at: trip.updatedAt,
      title: "You chose an option",
    });
  }

  if (trip.status === "booking_confirmed") {
    items.push({
      id: `confirmed-${trip.id}`,
      at: trip.updatedAt,
      title: "Trip confirmed",
    });
  }

  const seen = new Set<string>();
  return items
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .filter((item) => {
      const key = `${item.title}|${item.at.slice(0, 16)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

export function formatActivityTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
