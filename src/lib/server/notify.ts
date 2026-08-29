import { buildNotificationEmails } from "@/lib/email-content";
import { sendEmail } from "@/lib/server/mail";
import { NotificationEvent, TravelRequest } from "@/lib/types";
import { UpdateRequestBody } from "@/lib/request-ops";

export async function notifyTripEvent(
  event: NotificationEvent,
  request: TravelRequest,
  extra?: { messagePreview?: string },
) {
  const messages = buildNotificationEmails(event, request, extra);
  return Promise.all(messages.map((message) => sendEmail(message)));
}

export async function notifyFromUpdate(
  previous: TravelRequest,
  updated: TravelRequest,
  body: UpdateRequestBody,
) {
  if (body.silent) return;

  if (body.status) {
    const event =
      updated.status === "options_ready" ? "options_ready" : "status_updated";
    await notifyTripEvent(event, updated);
  }
  if (body.option || body.quote) {
    await notifyTripEvent("options_ready", updated);
  }
  if (body.selectedOptionId || body.selectedQuoteId) {
    await notifyTripEvent("option_selected", updated);
    await notifyTripEvent("status_updated", updated);
  }
  void previous;
}
