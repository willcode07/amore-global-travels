import { createId } from "@/lib/ids";
import { DemoNotification } from "@/lib/types";
import type { TravelRequest } from "@/lib/types";

const KEY = "amore_notifications";
const AGENT_ASSIGNMENT_KEY = "amore_agent_assignment_notifications";

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

export type AgentAssignmentNotification = {
  id: string;
  requestId: string;
  agentId: string;
  title: string;
  text: string;
  createdAt: string;
  readAt?: string;
};

function readAssignmentNotificationStore(): AgentAssignmentNotification[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(AGENT_ASSIGNMENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      notifications?: AgentAssignmentNotification[];
    };
    return Array.isArray(parsed.notifications) ? parsed.notifications : [];
  } catch {
    return [];
  }
}

function writeAssignmentNotificationStore(items: AgentAssignmentNotification[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    AGENT_ASSIGNMENT_KEY,
    JSON.stringify({ notifications: items.slice(0, 120) }),
  );
}

export function quoteAssignmentTitle(request: TravelRequest) {
  const firstName =
    request.intake?.firstName.trim() ||
    request.traveler.fullName.trim().split(/\s+/)[0] ||
    "Traveler";
  const destination = request.intake?.destination.trim() || request.trip.destination.trim();
  return `${firstName} is going to ${destination || "their destination"}`;
}

export function recordAgentAssignment(
  request: TravelRequest,
  agentId: string,
): AgentAssignmentNotification {
  const item: AgentAssignmentNotification = {
    id: createId("assignment"),
    requestId: request.id,
    agentId,
    title: quoteAssignmentTitle(request),
    text: `You were assigned: ${quoteAssignmentTitle(request)}.`,
    createdAt: new Date().toISOString(),
  };
  if (!canUseStorage()) return item;
  writeAssignmentNotificationStore([item, ...readAssignmentNotificationStore()]);
  return item;
}

export function agentAssignmentNotifications(agentId: string) {
  return readAssignmentNotificationStore()
    .filter((item) => item.agentId === agentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Clears only the notifications for the active Agent Portal identity. */
export function clearAgentAssignmentNotifications(agentId: string) {
  const remaining = readAssignmentNotificationStore().filter(
    (item) => item.agentId !== agentId,
  );
  writeAssignmentNotificationStore(remaining);
}

/**
 * Returns the notices that were unread immediately before they are marked read,
 * allowing the active portal identity to render an honest "new" state once.
 */
export function readAgentAssignmentNotifications(agentId: string) {
  const all = readAssignmentNotificationStore();
  const unread = all
    .filter((item) => item.agentId === agentId && !item.readAt)
    .map((item) => item.id);
  if (!unread.length || !canUseStorage()) return unread;

  const now = new Date().toISOString();
  writeAssignmentNotificationStore(
    all.map((item) =>
      unread.includes(item.id) ? { ...item, readAt: now } : item,
    ),
  );
  return unread;
}

const LOGIN_KEY = "amore_dashboard_login";

/** Record one sign-in per browser session so the activity log stays honest. */
export function logDashboardLogin(email: string) {
  if (!canUseStorage() || !email.trim()) return;
  try {
    const key = `${LOGIN_KEY}:${email.trim().toLowerCase()}`;
    if (window.sessionStorage.getItem(key) === "1") return;
    window.sessionStorage.setItem(key, "1");
    appendNotification({
      event: "system",
      to: email,
      subject: "Signed in to your dashboard",
      text: "You opened your dashboard.",
    });
  } catch {
    /* ignore private mode */
  }
}
