import { createId } from "@/lib/store";
import { DemoNotification } from "@/lib/types";

const KEY = "amore_notifications";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readNotifications(): DemoNotification[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { notifications?: DemoNotification[] };
    return parsed.notifications ?? [];
  } catch {
    return [];
  }
}

export function appendNotification(
  input: Omit<DemoNotification, "id" | "createdAt">,
): DemoNotification {
  const item: DemoNotification = {
    ...input,
    id: createId("note"),
    createdAt: new Date().toISOString(),
  };
  if (!canUseStorage()) return item;
  const next = [item, ...readNotifications()].slice(0, 80);
  window.localStorage.setItem(KEY, JSON.stringify({ notifications: next }));
  return item;
}

export function notificationsForTraveler(email: string) {
  const needle = email.trim().toLowerCase();
  return readNotifications().filter((item) => item.to.trim().toLowerCase() === needle);
}
