import { site } from "@/lib/site";
import { statusLabels } from "@/lib/agents";
import { NotificationEvent, TravelRequest } from "@/lib/types";

export type EmailResult = {
  delivered: boolean;
  provider: "demo";
  to: string;
  subject: string;
};

function siteBase() {
  if (typeof window !== "undefined") {
    return window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "");
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function dashboardUrl(request: TravelRequest) {
  return `${siteBase()}/dashboard?phone=${encodeURIComponent(request.traveler.phone)}&code=${request.accessCode}`;
}

function agentInboxUrl() {
  return `${siteBase()}/agent`;
}

function logEmail(to: string, subject: string, text: string): EmailResult {
  console.info("[email:demo]", { to, subject, text });
  return { delivered: false, provider: "demo", to, subject };
}

/** Demo notifications for the static GitHub Pages build (logged to the browser console). */
export function notifyEvent(
  event: NotificationEvent,
  request: TravelRequest,
  extra?: { messagePreview?: string },
): EmailResult[] {
  const agentEmail = process.env.NEXT_PUBLIC_AGENT_NOTIFY_EMAIL ?? site.email;
  const results: EmailResult[] = [];
  const tripLabel = `${request.trip.destination} · ${request.traveler.fullName}`;

  if (event === "request_submitted") {
    results.push(
      logEmail(
        agentEmail,
        `New travel request: ${tripLabel}`,
        [
          `A new travel request was submitted on ${site.name}.`,
          "",
          `Traveler: ${request.traveler.fullName}`,
          `Email: ${request.traveler.email}`,
          `Phone: ${request.traveler.phone}`,
          `Destination: ${request.trip.destination}`,
          `Travel window: ${request.trip.travelWindow}`,
          `Preferred agent: ${request.trip.preferredAgent}`,
          `Access code: ${request.accessCode}`,
          "",
          `Open agent inbox: ${agentInboxUrl()}`,
        ].join("\n"),
      ),
    );
    results.push(
      logEmail(
        request.traveler.email,
        `We received your ${site.name} travel request`,
        [
          `Hi ${request.traveler.fullName},`,
          "",
          `Thanks for starting your travel request with ${site.name}.`,
          `Your access code is: ${request.accessCode}`,
          "",
          "Use your phone number and this code anytime to view your trip dashboard:",
          dashboardUrl(request),
          "",
          `— ${site.name}`,
        ].join("\n"),
      ),
    );
  }

  if (event === "status_updated" || event === "options_ready") {
    results.push(
      logEmail(
        request.traveler.email,
        `Trip update: ${statusLabels[request.status] ?? request.status}`,
        [
          `Hi ${request.traveler.fullName},`,
          "",
          `Your trip status is now: ${statusLabels[request.status] ?? request.status}.`,
          event === "options_ready"
            ? "Your personalized travel options are ready to review in your dashboard."
            : "Open your dashboard for the latest details.",
          "",
          dashboardUrl(request),
        ].join("\n"),
      ),
    );
  }

  if (event === "option_selected") {
    results.push(
      logEmail(
        agentEmail,
        `Traveler selected an option: ${tripLabel}`,
        [
          `${request.traveler.fullName} selected a travel option.`,
          `Destination: ${request.trip.destination}`,
          `Selected option id: ${request.selectedOptionId ?? "n/a"}`,
          "",
          `Open agent inbox: ${agentInboxUrl()}`,
        ].join("\n"),
      ),
    );
  }

  if (event === "message_from_traveler") {
    results.push(
      logEmail(
        agentEmail,
        `New traveler message: ${tripLabel}`,
        [
          `${request.traveler.fullName} sent a message in the trip dashboard.`,
          "",
          extra?.messagePreview ?? "",
          "",
          `Reply in agent inbox: ${agentInboxUrl()}`,
        ].join("\n"),
      ),
    );
  }

  if (event === "message_from_agent") {
    results.push(
      logEmail(
        request.traveler.email,
        `New message from ${site.name}`,
        [
          `Hi ${request.traveler.fullName},`,
          "",
          "You have a new message about your travel request:",
          "",
          extra?.messagePreview ?? "",
          "",
          "View and reply in your dashboard:",
          dashboardUrl(request),
        ].join("\n"),
      ),
    );
  }

  return results;
}
