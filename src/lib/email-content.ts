import { statusLabels } from "@/lib/agents";
import { site } from "@/lib/site";
import { NotificationEvent, TravelRequest } from "@/lib/types";

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
};

function siteBase() {
  if (typeof window !== "undefined") {
    return window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "");
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function dashboardUrl(request: TravelRequest) {
  const params = new URLSearchParams({
    email: request.traveler.email,
    phone: request.traveler.phone,
    trip: request.id,
  });
  return `${siteBase()}/dashboard?${params.toString()}`;
}

export function agentInboxUrl() {
  return `${siteBase()}/agent`;
}

export function buildNotificationEmails(
  event: NotificationEvent,
  request: TravelRequest,
  extra?: { messagePreview?: string },
): OutboundEmail[] {
  const agentEmail = process.env.NEXT_PUBLIC_AGENT_NOTIFY_EMAIL ?? site.email;
  const results: OutboundEmail[] = [];
  const tripLabel = `${request.trip.destination} · ${request.traveler.fullName}`;
  const tripRef = request.tripRef || request.accessCode || request.id;

  if (event === "request_submitted") {
    results.push({
      to: agentEmail,
      subject: `New travel request: ${tripLabel}`,
      text: [
        `A new travel request was submitted on ${site.name}.`,
        "",
        `Traveler: ${request.traveler.fullName}`,
        `Email: ${request.traveler.email}`,
        `Phone: ${request.traveler.phone}`,
        `Destination: ${request.trip.destination}`,
        `Trip type: ${request.trip.tripType}`,
        `Travel window: ${request.trip.travelWindow}`,
        `Preferred agent: ${request.trip.preferredAgent}`,
        `Trip reference: ${tripRef}`,
        "",
        `Open agent inbox: ${agentInboxUrl()}`,
      ].join("\n"),
    });
    results.push({
      to: request.traveler.email,
      subject: `We received your ${site.name} travel request`,
      text: [
        `Hi ${request.traveler.fullName},`,
        "",
        `Thanks for starting your travel request with ${site.name}.`,
        "Use the same email and phone number anytime to open your trip dashboard — all of your quotes will be there.",
        "",
        dashboardUrl(request),
        "",
        `— ${site.name}`,
      ].join("\n"),
    });
  }

  if (event === "status_updated" || event === "options_ready") {
    results.push({
      to: request.traveler.email,
      subject:
        event === "options_ready"
          ? `Your ${site.name} quote is ready`
          : `Trip update: ${statusLabels[request.status] ?? request.status}`,
      text: [
        `Hi ${request.traveler.fullName},`,
        "",
        `Your trip status is now: ${statusLabels[request.status] ?? request.status}.`,
        event === "options_ready"
          ? "Your personalized travel quote is ready to review in your dashboard."
          : "Open your dashboard for the latest details.",
        "",
        dashboardUrl(request),
      ].join("\n"),
    });
  }

  if (event === "option_selected") {
    results.push({
      to: agentEmail,
      subject: `Traveler selected a quote: ${tripLabel}`,
      text: [
        `${request.traveler.fullName} selected a travel quote.`,
        `Destination: ${request.trip.destination}`,
        `Trip reference: ${tripRef}`,
        "",
        `Open agent inbox: ${agentInboxUrl()}`,
      ].join("\n"),
    });
  }

  if (event === "message_from_traveler") {
    results.push({
      to: agentEmail,
      subject: `New traveler message: ${tripLabel}`,
      text: [
        `${request.traveler.fullName} sent a message in the trip dashboard.`,
        "",
        extra?.messagePreview ?? "",
        "",
        `Reply in agent inbox: ${agentInboxUrl()}`,
      ].join("\n"),
    });
  }

  if (event === "message_from_agent") {
    results.push({
      to: request.traveler.email,
      subject: `New message from ${site.name}`,
      text: [
        `Hi ${request.traveler.fullName},`,
        "",
        "You have a new message about your travel request:",
        "",
        extra?.messagePreview ?? "",
        "",
        "View and reply in your dashboard:",
        dashboardUrl(request),
      ].join("\n"),
    });
  }

  return results;
}

export function otpEmail(kind: "agent" | "traveler", code: string): Pick<OutboundEmail, "subject" | "text"> {
  const who = kind === "agent" ? "agent inbox" : "trip dashboard";
  return {
    subject: `Your ${site.name} sign-in code`,
    text: [
      `Your one-time code to open the ${who} is: ${code}`,
      "",
      "It expires in 10 minutes. If you did not request this, you can ignore this email.",
      "",
      `— ${site.name}`,
    ].join("\n"),
  };
}
