import { buildNotificationEmails } from "@/lib/email-content";
import { appendNotification } from "@/lib/notifications";
import { NotificationEvent, TravelRequest } from "@/lib/types";

export type EmailResult = {
  delivered: boolean;
  provider: "demo";
  to: string;
  subject: string;
};

/** Browser-only demo inbox (localStorage). API mode sends mail from the server. */
export function notifyEvent(
  event: NotificationEvent,
  request: TravelRequest,
  extra?: { messagePreview?: string },
): EmailResult[] {
  return buildNotificationEmails(event, request, extra).map((message) => {
    console.info("[email:demo]", message);
    appendNotification({
      event,
      to: message.to,
      subject: message.subject,
      text: message.text,
      requestId: request.id,
    });
    return {
      delivered: false,
      provider: "demo" as const,
      to: message.to,
      subject: message.subject,
    };
  });
}
