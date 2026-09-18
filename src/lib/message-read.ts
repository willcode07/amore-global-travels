import type { Message, TravelRequest } from "@/lib/types";

function readKey(requestId: string) {
  return `amore_agent_read:${requestId}`;
}

export function isNoticeMessage(message: Message) {
  if (message.kind === "notice") return true;
  if (message.kind === "chat") return false;
  if (message.attachments?.length) return false;
  return (
    message.sender === "agent" &&
    /quote is ready to review|trip has been confirmed/i.test(message.body)
  );
}

export function readLastOpenedAt(requestId: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(readKey(requestId)) ?? "";
  } catch {
    return "";
  }
}

export function markRequestRead(requestId: string, at = new Date().toISOString()) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(readKey(requestId), at);
  } catch {
    // ignore
  }
}

export function travelerUnreadCount(request: TravelRequest, lastOpenedAt?: string) {
  const cutoff = lastOpenedAt || readLastOpenedAt(request.id);
  return request.messages.filter((message) => {
    if (message.sender !== "traveler" || isNoticeMessage(message)) return false;
    if (!cutoff) return true;
    return message.createdAt > cutoff;
  }).length;
}
