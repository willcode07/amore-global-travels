"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AgentClientDetails } from "@/components/AgentClientDetails";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MessageThread } from "@/components/MessageThread";
import { PaymentPlanPanel } from "@/components/PaymentPlanPanel";
import { QuoteComposer } from "@/components/QuoteComposer";
import { QuoteDocument } from "@/components/QuoteDocument";
import { StatusTracker } from "@/components/StatusTracker";
import {
  agentNameForId,
  assignableAgents,
  defaultAssignedAgentId,
  normalizeAssignedAgentId,
  parseAgentId,
  paymentLabels,
  paymentOrder,
  tripTypeLabels,
} from "@/lib/agents";
import {
  AGENT_IDENTITY_KEY,
  AGENT_UNLOCK_KEY,
  confirmBlockedReason,
  formatLastUpdated,
  ownsRequest,
  paymentConfirmCopy,
  statusConfirmCopy,
} from "@/lib/agent-desk";
import { travelerUnreadCount } from "@/lib/message-read";
import {
  paymentPlanTypeLabels,
  scheduleSummary,
} from "@/lib/payments";
import { downloadCsv, requestsToCsv } from "@/lib/csv";
import { isApiBackend } from "@/lib/data/mode";
import { resetApiAuthCache } from "@/lib/data/session-cache";
import {
  formatDisplayDate,
  formatIntakeAddress,
  formatPartySummary,
  formatRequestParty,
  QuoteIntakeFields,
  toTripIntake,
} from "@/lib/intake";
import {
  journeyStageIndex,
  statusForJourneyStage,
  tripStatusSteps,
  travelerFacingStatus,
  tripStatusTitle,
} from "@/lib/journey";
import {
  AgentAssignmentNotification,
  agentAssignmentNotifications,
  clearAgentAssignmentNotifications,
  quoteAssignmentTitle,
  readAgentAssignmentNotifications,
  readNotifications,
  recordAgentAssignment,
} from "@/lib/notifications";
import { evaluateQuoteQuality } from "@/lib/quote-quality";
import { listRequests, updateRequest } from "@/lib/requests";
import { emailsMatch, phonesMatch } from "@/lib/session";
import { logoutApiSession, postJson } from "@/lib/uploads";
import {
  DemoNotification,
  InstallmentPayment,
  PaymentPlanType,
  PaymentStatus,
  RequestStatus,
  TravelProposal,
  TravelRequest,
  TripType,
} from "@/lib/types";

type QueueSort = "assigned" | "agent" | "traveler";
type ComposerMode = "quote" | "flyer";
type PendingConfirm =
  | { kind: "status"; status: RequestStatus }
  | { kind: "payment"; status: PaymentStatus }
  | { kind: "move"; agentId: string }
  | { kind: "take" };

function todayInputDate() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function paymentDateFor(request: TravelRequest) {
  if (request.paymentStatus === "refunded") return request.refundedAt ?? "";
  if (request.paymentStatus === "paid") return request.paidAt ?? "";
  return "";
}

export default function AgentPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [loginAgentId, setLoginAgentId] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoCode, setDemoCode] = useState("");
  const [clienteaseRef, setClienteaseRef] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showClientForms, setShowClientForms] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("quote");
  const [editingQuote, setEditingQuote] = useState<TravelProposal | undefined>();
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<DemoNotification[]>([]);
  const [viewingAgentId, setViewingAgentId] = useState(defaultAssignedAgentId);
  const [viewingAgentInitialized, setViewingAgentInitialized] = useState(false);
  const [onlyMyAssignments, setOnlyMyAssignments] = useState(true);
  const [queueSort, setQueueSort] = useState<QueueSort>("assigned");
  const [assignmentAlerts, setAssignmentAlerts] = useState<AgentAssignmentNotification[]>(
    [],
  );
  const [unreadAssignmentIds, setUnreadAssignmentIds] = useState<string[]>([]);

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  );
  const selectedPaymentDate = selected ? paymentDateFor(selected) : "";
  const ownsSelected = selected ? ownsRequest(selected, viewingAgentId) : false;
  const searchActive = query.trim().length > 0;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = !needle
      ? requests
      : requests.filter((request) =>
      [
        request.traveler.fullName,
        request.traveler.email,
        request.traveler.phone,
        request.trip.destination,
        request.trip.tripType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
      );
    const visible = onlyMyAssignments
      ? matching.filter((request) => request.assignedAgentId === viewingAgentId)
      : matching;
    return [...visible].sort((a, b) => {
      if (queueSort === "assigned") {
        const aAssigned = a.assignedAgentId === viewingAgentId ? 0 : 1;
        const bAssigned = b.assignedAgentId === viewingAgentId ? 0 : 1;
        if (aAssigned !== bAssigned) return aAssigned - bAssigned;
      }

      if (queueSort === "agent") {
        const byAgent = agentNameForId(a.assignedAgentId).localeCompare(
          agentNameForId(b.assignedAgentId),
        );
        if (byAgent !== 0) return byAgent;
      }

      return a.traveler.fullName.localeCompare(b.traveler.fullName);
    });
  }, [onlyMyAssignments, query, queueSort, requests, viewingAgentId]);

  const relatedCount = selected
    ? requests.filter(
        (request) =>
          emailsMatch(request.traveler.email, selected.traveler.email) &&
          phonesMatch(request.traveler.phone, selected.traveler.phone),
      ).length - 1
    : 0;

  useEffect(() => {
    if (isApiBackend()) {
      void fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/me`, {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { role?: string } | null) => {
          if (data?.role === "agent") setUnlocked(true);
        })
        .catch(() => undefined);
      return;
    }
    if (localStorage.getItem(AGENT_UNLOCK_KEY) === "1") {
      const identity = parseAgentId(localStorage.getItem(AGENT_IDENTITY_KEY));
      if (identity) {
        setViewingAgentId(identity);
        setLoginAgentId(identity);
        setUnlocked(true);
      }
    }
  }, []);

  useEffect(() => {
    setClienteaseRef(selected?.clienteaseRef ?? "");
    setPaymentNote(selected?.paymentNote ?? "");
    setPaymentDate(selectedPaymentDate);
  }, [selected?.id, selected?.clienteaseRef, selected?.paymentNote, selectedPaymentDate]);

  useEffect(() => {
    if (!unlocked) return;
    void loadRequests();
    setNotes(readNotifications().filter((note) => note.to.includes("@")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) {
      setViewingAgentInitialized(false);
      return;
    }
    if (isApiBackend()) {
      setViewingAgentInitialized(true);
      return;
    }
    const stored = parseAgentId(localStorage.getItem(AGENT_IDENTITY_KEY));
    if (!stored) {
      setUnlocked(false);
      setViewingAgentInitialized(false);
      return;
    }
    setViewingAgentId(stored);
    setViewingAgentInitialized(true);
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked || !viewingAgentInitialized) return;
    const unread = readAgentAssignmentNotifications(viewingAgentId);
    setUnreadAssignmentIds(unread);
    setAssignmentAlerts(agentAssignmentNotifications(viewingAgentId));
  }, [unlocked, viewingAgentId, viewingAgentInitialized]);

  useEffect(() => {
    if (!selectedId || filtered.some((request) => request.id === selectedId)) return;
    setComposing(false);
    setEditingQuote(undefined);
    if (searchActive && filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, searchActive, selectedId]);

  async function loadRequests() {
    try {
      const next = await listRequests();
      setRequests(next);
      setNotes(readNotifications());
      if (!searchActive && !selectedId && next[0]) {
        setSelectedId(next[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load trips.");
    }
  }

  async function handleUnlock(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (isApiBackend()) {
      try {
        if (!otpSent) {
          const data = await postJson<{ demoCode?: string }>("/api/auth/agent/otp", {
            email: agentEmail,
          });
          setOtpSent(true);
          setDemoCode(data.demoCode ?? "");
          return;
        }
        await postJson("/api/auth/agent/verify", { email: agentEmail, code: otpCode });
        resetApiAuthCache();
        setUnlocked(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to sign in.");
      }
      return;
    }
    const expected = process.env.NEXT_PUBLIC_AGENT_PASSCODE || "amore-agents";
    if (passcode.trim() !== expected) {
      setError("Incorrect agent passcode.");
      return;
    }
    const identity = parseAgentId(loginAgentId);
    if (!identity) {
      setError("Choose your name so the desk opens your files.");
      return;
    }
    localStorage.setItem(AGENT_UNLOCK_KEY, "1");
    localStorage.setItem(AGENT_IDENTITY_KEY, identity);
    setViewingAgentId(identity);
    setUnlocked(true);
  }

  async function handleSignOut() {
    localStorage.removeItem(AGENT_UNLOCK_KEY);
    localStorage.removeItem(AGENT_IDENTITY_KEY);
    if (isApiBackend()) {
      resetApiAuthCache();
      await logoutApiSession();
    }
    setUnlocked(false);
    setRequests([]);
    setViewingAgentInitialized(false);
    setLoginAgentId("");
  }

  function deskAudit(action: string, detail?: string) {
    return {
      agentId: viewingAgentId,
      agentName: agentNameForId(viewingAgentId),
      action,
      detail,
    };
  }

  function requireOwnFile() {
    if (!selected) return false;
    if (ownsRequest(selected, viewingAgentId)) return true;
    setError("This file belongs to another agent. Take it first if you need to work it.");
    return false;
  }

  async function applyStatus(status: RequestStatus) {
    if (!selected || !requireOwnFile()) return;
    if (journeyStageIndex(selected.status) === journeyStageIndex(status)) return;
    if (status === "booking_confirmed") {
      const reason = confirmBlockedReason(selected);
      if (reason) {
        setError(reason);
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        status,
        audit: deskAudit("status", tripStatusTitle(status)),
      });
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setSaving(false);
    }
  }

  function requestStatusChange(status: RequestStatus) {
    if (!selected || !requireOwnFile()) return;
    if (journeyStageIndex(selected.status) === journeyStageIndex(status)) return;
    if (status === "booking_confirmed") {
      const reason = confirmBlockedReason(selected);
      if (reason) {
        setError(reason);
        return;
      }
      setPendingConfirm({ kind: "status", status });
      return;
    }
    void applyStatus(status);
  }

  async function applyPayment(status: PaymentStatus) {
    if (!selected || !requireOwnFile()) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        paymentStatus: status,
        ...(status === "paid" ? { paidAt: selected.paidAt || todayInputDate() } : {}),
        ...(status === "refunded"
          ? { refundedAt: selected.refundedAt || todayInputDate() }
          : {}),
        audit: deskAudit("payment", paymentLabels[status]),
      });
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update payment.");
    } finally {
      setSaving(false);
    }
  }

  function requestPaymentChange(status: PaymentStatus) {
    if (!selected || !requireOwnFile()) return;
    if (status === "paid" || status === "refunded") {
      setPendingConfirm({ kind: "payment", status });
      return;
    }
    void applyPayment(status);
  }

  async function savePaymentPlan(input: {
    paymentPlanType: PaymentPlanType;
    paymentSchedule: InstallmentPayment[];
  }) {
    if (!selected || !requireOwnFile()) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        paymentPlanType: input.paymentPlanType,
        paymentSchedule: input.paymentSchedule,
        audit: deskAudit("payment_plan", input.paymentPlanType),
      });
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save payment plan.");
    } finally {
      setSaving(false);
    }
  }

  function refreshAssignmentAlerts(agentId = viewingAgentId) {
    const unread = readAgentAssignmentNotifications(agentId);
    setUnreadAssignmentIds(unread);
    setAssignmentAlerts(agentAssignmentNotifications(agentId));
  }

  function clearNotifications() {
    clearAgentAssignmentNotifications(viewingAgentId);
    setAssignmentAlerts([]);
    setUnreadAssignmentIds([]);
  }

  async function applyAssignedAgent(assignedAgentId: string) {
    if (!selected) return;
    const nextAgentId = normalizeAssignedAgentId(assignedAgentId);
    if (selected.assignedAgentId === nextAgentId) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        assignedAgentId: nextAgentId,
        audit: deskAudit("assign", agentNameForId(nextAgentId)),
      });
      recordAgentAssignment(updated, updated.assignedAgentId);
      await loadRequests();
      setSelectedId(updated.id);
      refreshAssignmentAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to move this travel quote.");
    } finally {
      setSaving(false);
    }
  }

  async function savePaymentDetails() {
    if (!selected || !requireOwnFile()) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        paymentNote: paymentNote.trim(),
        ...(selected.paymentStatus === "paid" ? { paidAt: paymentDate } : {}),
        ...(selected.paymentStatus === "refunded" ? { refundedAt: paymentDate } : {}),
        audit: deskAudit("payment_details"),
      });
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save payment details.");
    } finally {
      setSaving(false);
    }
  }

  async function saveClientIntake(data: QuoteIntakeFields, tripType: TripType) {
    if (!selected || !requireOwnFile()) return;
    const previousAgentId = selected.assignedAgentId;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        intake: toTripIntake(data, tripType, selected.intake?.completedAt),
        audit: deskAudit("client_details"),
      });
      if (updated.assignedAgentId !== previousAgentId) {
        recordAgentAssignment(updated, updated.assignedAgentId);
        refreshAssignmentAlerts();
      }
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save trip details.");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function publishQuote(quote: TravelProposal) {
    if (!selected || !requireOwnFile()) return;
    const quality = evaluateQuoteQuality(quote);
    if (!quality.canPublish) {
      setError(
        `Quote has ${quality.errors.length} blocking Quality Check issue${
          quality.errors.length === 1 ? "" : "s"
        }. Resolve them before sending.`,
      );
      return;
    }
    setSaving(true);
    try {
      const updated = await updateRequest(selected.id, {
        quote,
        audit: deskAudit("quote", quote.occasionTitle),
      });
      setComposing(false);
      setEditingQuote(undefined);
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish quote.");
    } finally {
      setSaving(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <form
          onSubmit={handleUnlock}
          className="rounded-3xl border border-line bg-surface p-8"
        >
          <h1 className="font-display text-3xl text-ink">Agent inbox</h1>
          {isApiBackend() ? (
            <>
              <p className="mt-2 text-sm text-muted">
                Sign in with a one-time email code. Add your address to{" "}
                <code>AGENT_LOGIN_EMAILS</code> until Amore provides agent inboxes.
              </p>
              <input
                value={agentEmail}
                onChange={(event) => setAgentEmail(event.target.value)}
                type="email"
                required
                placeholder="Agent email"
                className="mt-6 w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
              />
              {otpSent ? (
                <input
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  inputMode="numeric"
                  placeholder="6-digit code"
                  className="mt-3 w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
                />
              ) : null}
              {demoCode ? (
                <p className="mt-3 rounded-2xl bg-cream px-3 py-2 text-sm text-ink">
                  Demo code (Resend not configured): <strong>{demoCode}</strong>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">
                Sign in with your name and the desk passcode. Your queue opens on files assigned to you.
              </p>
              <label className="mt-6 block text-sm">
                <span className="mb-1.5 block font-medium text-ink">Your name</span>
                <select
                  required
                  value={loginAgentId}
                  onChange={(event) => setLoginAgentId(event.target.value)}
                  className="w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
                >
                  <option value="">Select your name</option>
                  {assignableAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>
              <input
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                type="password"
                placeholder="Desk passcode"
                className="mt-3 w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
              />
            </>
          )}
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className="mt-4 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold"
          >
            {isApiBackend() && !otpSent ? "Send code" : "Open my desk"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
            Agent Portal
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Travel Quotes</h1>
          <p className="mt-2 max-w-2xl text-muted">
            One queue for quotes, client fix-up, payment, and messages. Files assigned to
            someone else are read-only until you take them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <p className="flex items-center rounded-full border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink">
            Signed in as {agentNameForId(viewingAgentId)}
          </p>
          <button
            type="button"
            aria-pressed={onlyMyAssignments}
            onClick={() => setOnlyMyAssignments((active) => !active)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              onlyMyAssignments
                ? "bg-cream text-gold-deep"
                : "border border-line text-ink"
            }`}
          >
            {onlyMyAssignments ? "Assigned to me" : "All files (read-only others)"}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadCsv(`amore-trips-${Date.now()}.csv`, requestsToCsv(requests))
            }
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setShowClientForms((open) => !open);
              setComposing(false);
            }}
            className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-on-gold"
          >
            Clients
          </button>
          <button
            type="button"
            onClick={() => loadRequests()}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>

      {assignmentAlerts.length > 0 ? (
        <details className="mb-6 rounded-3xl border border-line bg-cream px-5 py-3">
          <summary className="cursor-pointer font-display text-lg text-ink">
            Desk notices
            {unreadAssignmentIds.length
              ? ` · ${unreadAssignmentIds.length} new`
              : ""}
          </summary>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted">
              Recent assignments for {agentNameForId(viewingAgentId)}.
            </p>
            <button
              type="button"
              onClick={clearNotifications}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
            >
              Clear notices
            </button>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {assignmentAlerts.slice(0, 4).map((notice) => (
              <li
                key={notice.id}
                className={`rounded-2xl bg-surface px-3 py-2 text-ink ${
                  unreadAssignmentIds.includes(notice.id) ? "ring-1 ring-gold" : ""
                }`}
              >
                {notice.text}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {showClientForms && (
        <section className="mb-10 rounded-3xl bg-cream p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-ink">Clients</h2>
              <p className="mt-1 text-sm text-muted">
                Submitted trip details for the selected travel quote.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowClientForms(false)}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold"
            >
              Close
            </button>
          </div>
          <AgentClientDetails
            key={selected?.id ?? "none"}
            request={selected}
            saving={saving}
            onSave={saveClientIntake}
          />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-line bg-surface p-4">
          <h2 className="px-2 font-display text-xl text-ink">Travel Quotes</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search traveler or destination"
            className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-gold focus:ring-2"
          />
          <label className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-muted">
            Sort travel quotes
            <select
              value={queueSort}
              onChange={(event) => setQueueSort(event.target.value as QueueSort)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink outline-none ring-gold focus:ring-2"
              aria-label="Sort travel quotes"
            >
              <option value="assigned">Assigned to me first</option>
              <option value="agent">By agent</option>
              <option value="traveler">By traveller</option>
            </select>
          </label>
          <div className="mt-3 space-y-2">
            {filtered.length === 0 && (
              <p className="px-2 py-4 text-sm text-muted">
                {searchActive ? "No matching requests." : "No requests yet."}
              </p>
            )}
            {filtered.map((request) => {
              const unread = travelerUnreadCount(request);
              return (
              <button
                key={request.id}
                type="button"
                onClick={() => {
                  setSelectedId(request.id);
                  setComposing(false);
                  setEditingQuote(undefined);
                }}
                className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                  selectedId === request.id ? "bg-cream" : "hover:bg-cream/60"
                } ${request.assignedAgentId === viewingAgentId ? "ring-1 ring-gold" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-ink">{quoteAssignmentTitle(request)}</div>
                  {unread > 0 ? (
                    <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-on-gold">
                      {unread} new
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-muted">
                  Agent: {agentNameForId(request.assignedAgentId)}
                  {request.assignedAgentId === viewingAgentId ? " · Assigned to me" : ""}
                </div>
                <div className="mt-1 text-xs font-medium text-gold-deep">
                  {tripStatusTitle(request.status)}
                </div>
              </button>
            );
            })}
          </div>
        </aside>

        {!selected ? (
          <div className="rounded-3xl border border-line bg-surface p-8 text-muted">
            {searchActive && filtered.length === 0
              ? "No matching requests."
              : "Select a trip to manage it, or open Clients to add details."}
          </div>
        ) : composing ? (
          <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <QuoteComposer
              key={`${selected.id}-${composerMode}-${editingQuote?.id ?? "new"}`}
              request={selected}
              initial={editingQuote}
              mode={composerMode}
              replacing={Boolean(editingQuote)}
              saving={saving}
              onPublish={publishQuote}
              onCancel={() => {
                setComposing(false);
                setEditingQuote(undefined);
              }}
            />
          </section>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl text-ink">
                    {quoteAssignmentTitle(selected)}
                  </h2>
                  <p className="mt-1 text-muted">
                    {selected.traveler.fullName} · {selected.traveler.email} ·{" "}
                    {selected.traveler.phone}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Preferred agent: {selected.trip.preferredAgent || "—"}
                    {relatedCount > 0
                      ? ` · ${relatedCount} other trip${relatedCount === 1 ? "" : "s"} for this traveler`
                      : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">
                      Assigned to: {agentNameForId(selected.assignedAgentId)}
                    </p>
                    {ownsSelected ? (
                      <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                        Move to
                        <select
                          value={selected.assignedAgentId}
                          disabled={saving}
                          onChange={(event) =>
                            setPendingConfirm({ kind: "move", agentId: event.target.value })
                          }
                          className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink outline-none ring-gold focus:ring-2"
                          aria-label="Move this file to another agent"
                        >
                          {assignableAgents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setPendingConfirm({ kind: "take" })}
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        Take this file
                      </button>
                    )}
                  </div>
                  {formatLastUpdated(selected) ? (
                    <p className="mt-2 text-xs text-muted">{formatLastUpdated(selected)}</p>
                  ) : null}
                  {!ownsSelected ? (
                    <p className="mt-3 rounded-2xl bg-cream px-4 py-3 text-sm text-ink">
                      Read-only. This file is assigned to{" "}
                      {agentNameForId(selected.assignedAgentId)}. Take it before editing.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6">
                <StatusTracker status={travelerFacingStatus(selected)} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {tripStatusSteps.map((step, index) => {
                  const active = journeyStageIndex(selected.status) === index;
                  return (
                    <button
                      key={step.title}
                      type="button"
                      disabled={saving || !ownsSelected}
                      onClick={() => requestStatusChange(statusForJourneyStage(index))}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        active
                          ? "bg-gold text-on-gold"
                          : "border border-line bg-surface text-muted"
                      }`}
                    >
                      {step.title}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-ink">Payment status</p>
                <div className="flex flex-wrap gap-2">
                  {paymentOrder.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={saving || !ownsSelected}
                      onClick={() => requestPaymentChange(status)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        selected.paymentStatus === status
                          ? "bg-brand text-on-brand"
                          : "border border-line bg-surface text-muted"
                      }`}
                    >
                      {paymentLabels[status]}
                    </button>
                  ))}
                </div>
              </div>
              <PaymentPlanPanel
                request={selected}
                editable={ownsSelected}
                saving={saving}
                onSavePlan={savePaymentPlan}
              />
              {selected.paymentStatus === "paid" || selected.paymentStatus === "refunded" ? (
                <form
                  className="mt-4 grid gap-3 sm:grid-cols-[minmax(180px,220px)_1fr_auto] sm:items-end"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void savePaymentDetails();
                  }}
                >
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">
                      {selected.paymentStatus === "paid" ? "Date paid" : "Date refunded"}
                    </span>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(event) => setPaymentDate(event.target.value)}
                      className="w-full rounded-xl border border-line px-4 py-2.5 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">
                      Confirmation / reference / notes
                    </span>
                    <input
                      value={paymentNote}
                      onChange={(event) => setPaymentNote(event.target.value)}
                      placeholder="Confirmation number, processor, or notes"
                      className="w-full rounded-xl border border-line px-4 py-2.5 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={saving || !ownsSelected}
                    className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold"
                  >
                    Save payment details
                  </button>
                </form>
              ) : null}

              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Travel window</dt>
                  <dd className="font-medium">{selected.trip.travelWindow}</dd>
                </div>
                <div>
                  <dt className="text-muted">Budget</dt>
                  <dd className="font-medium">{selected.trip.budget || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Travelers</dt>
                  <dd className="font-medium">{formatRequestParty(selected)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Trip type</dt>
                  <dd className="font-medium">
                    {tripTypeLabels[selected.trip.tripType] ?? selected.trip.tripType}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Trip style</dt>
                  <dd className="font-medium">
                    {selected.trip.tripStyle.join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Payment</dt>
                  <dd className="font-medium">
                    {paymentLabels[selected.paymentStatus]}
                    {selected.paymentPlanType && selected.paymentPlanType !== "none"
                      ? ` · ${paymentPlanTypeLabels[selected.paymentPlanType]}`
                      : ""}
                    {scheduleSummary(selected)
                      ? ` · ${scheduleSummary(selected)}`
                      : ""}
                    {paymentDateFor(selected)
                      ? ` · ${formatDisplayDate(paymentDateFor(selected))}`
                      : ""}
                    {selected.paymentNote ? ` · ${selected.paymentNote}` : ""}
                  </dd>
                </div>
              </dl>
              <form
                className="mt-5 flex flex-wrap items-end gap-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!selected || !requireOwnFile()) return;
                  setSaving(true);
                  try {
                    const updated = await updateRequest(selected.id, {
                      clienteaseRef: clienteaseRef.trim() || null,
                      audit: deskAudit("clientease_ref"),
                    });
                    await loadRequests();
                    setSelectedId(updated.id);
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Unable to save ClientEase ref.",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <label className="block min-w-[220px] flex-1 text-sm">
                  <span className="mb-1.5 block font-medium text-ink">
                    ClientEase booking ref
                  </span>
                  <input
                    value={clienteaseRef}
                    onChange={(event) => setClienteaseRef(event.target.value)}
                    placeholder="Paste after you enter the booking in ClientEase"
                    className="w-full rounded-xl border border-line px-4 py-2.5 outline-none ring-gold focus:ring-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving || !ownsSelected}
                  className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold"
                >
                  Save ref
                </button>
              </form>
              {selected.trip.preferences || selected.intake?.notes ? (
                <div className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm">
                  <p className="font-medium text-ink">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {selected.intake?.notes || selected.trip.preferences}
                  </p>
                </div>
              ) : null}
              {selected.intake ? (
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  {formatIntakeAddress(selected.intake) ? (
                    <div>
                      <dt className="text-muted">Address</dt>
                      <dd className="font-medium">{formatIntakeAddress(selected.intake)}</dd>
                    </div>
                  ) : null}
                  {selected.intake.preferredContactMethods.length > 0 ? (
                    <div>
                      <dt className="text-muted">Preferred contact</dt>
                      <dd className="font-medium">
                        {selected.intake.preferredContactMethods.join(", ")}
                      </dd>
                    </div>
                  ) : null}
                  {selected.intake.transportationModes.length > 0 ? (
                    <div>
                      <dt className="text-muted">Transportation</dt>
                      <dd className="font-medium">
                        {selected.intake.transportationModes.join(", ")}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted">Party</dt>
                    <dd className="font-medium">{formatPartySummary(selected.intake)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
                  Expanded trip details have not been submitted yet. You can still
                  generate a quote from this request.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-ink">Generate a quote</h3>
                  <p className="mt-1 text-sm text-muted">
                    Opens a short draft: property, room, stay total, taxes/fees, cancellation.
                    Fill starred fields — Send turns on when Quality Check is clear.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!ownsSelected}
                  onClick={() => {
                    setComposerMode("quote");
                    setEditingQuote(undefined);
                    setComposing(true);
                  }}
                  className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-on-gold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selected.quotes.length ? "Add another quote" : "Generate a quote"}
                </button>
              </div>

              {selected.quotes.map((quote) => (
                <div key={quote.id} className="mt-6">
                  <QuoteDocument quote={quote} request={selected} />
                  {selected.selectedQuoteId === quote.id ? (
                    <p className="mt-3 text-sm font-semibold text-gold-deep">
                      Traveler selected this quote.
                    </p>
                  ) : null}
                  {ownsSelected ? (
                    <button
                      type="button"
                      onClick={() => {
                        setComposerMode("quote");
                        setEditingQuote(quote);
                        setComposing(true);
                      }}
                      className="mt-3 mr-3 text-sm font-semibold text-gold-deep"
                    >
                      Revise this quote
                    </button>
                  ) : null}
                  {quote.pdfUrl ? (
                    <a
                      href={quote.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-sm font-semibold text-gold-deep underline underline-offset-4"
                    >
                      Quote PDF
                    </a>
                  ) : null}
                </div>
              ))}
              {(selected.quoteHistory ?? []).length > 0 ? (
                <details className="mt-4 rounded-2xl border border-line px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">
                    Previous versions ({selected.quoteHistory?.length})
                  </summary>
                  <ul className="mt-3 space-y-2 text-sm text-muted">
                    {selected.quoteHistory?.map((quote) => (
                      <li key={`${quote.id}-${quote.createdAt}`}>
                        {quote.occasionTitle} · {quote.investmentTotal || "no total"}
                        {ownsSelected ? (
                          <button
                            type="button"
                            className="ml-3 font-semibold text-gold-deep"
                            onClick={() => {
                              setComposerMode("quote");
                              setEditingQuote(quote);
                              setComposing(true);
                            }}
                          >
                            Restore
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>

            <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
              <h3 className="font-display text-2xl text-ink">Attach a flyer</h3>
              <p className="mt-1 text-sm text-muted">
                Title, total, and a Canva/PDF/image link. This does not open the full quote builder.
              </p>
              <button
                type="button"
                disabled={!ownsSelected}
                onClick={() => {
                  setComposerMode("flyer");
                  setEditingQuote(undefined);
                  setComposing(true);
                }}
                className="mt-5 rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                Attach flyer
              </button>
            </section>

            <MessageThread
              messages={selected.messages}
              sender="agent"
              senderName="Amore Global Agent"
              requestId={selected.id}
              onSent={async () => {
                await loadRequests();
              }}
            />

            {notes.filter((note) => note.requestId === selected.id).length > 0 && (
              <section className="rounded-3xl border border-line bg-surface p-6">
                <h3 className="font-display text-xl text-ink">Trip notifications</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {notes
                    .filter((note) => note.requestId === selected.id)
                    .slice(0, 5)
                    .map((note) => (
                      <li key={note.id}>
                        {note.subject} → {note.to}
                      </li>
                    ))}
                </ul>
              </section>
            )}

            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={
          pendingConfirm?.kind === "status"
            ? statusConfirmCopy(pendingConfirm.status).title
            : pendingConfirm?.kind === "payment"
              ? paymentConfirmCopy(pendingConfirm.status).title
              : pendingConfirm?.kind === "take"
                ? "Take this file?"
                : pendingConfirm?.kind === "move"
                  ? "Move this file?"
                  : "Please confirm"
        }
        body={
          pendingConfirm?.kind === "status"
            ? statusConfirmCopy(pendingConfirm.status).body
            : pendingConfirm?.kind === "payment"
              ? paymentConfirmCopy(pendingConfirm.status).body
              : pendingConfirm?.kind === "take"
                ? `This file will be assigned to you (${agentNameForId(viewingAgentId)}) so you can edit it.`
                : pendingConfirm?.kind === "move"
                  ? `This file will move to ${agentNameForId(pendingConfirm.agentId)}. You will no longer be able to edit it unless you take it back.`
                  : ""
        }
        confirmLabel={
          pendingConfirm?.kind === "status"
            ? statusConfirmCopy(pendingConfirm.status).confirmLabel
            : pendingConfirm?.kind === "payment"
              ? paymentConfirmCopy(pendingConfirm.status).confirmLabel
              : pendingConfirm?.kind === "take"
                ? "Take file"
                : "Move file"
        }
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          const pending = pendingConfirm;
          setPendingConfirm(null);
          if (!pending) return;
          if (pending.kind === "status") void applyStatus(pending.status);
          if (pending.kind === "payment") void applyPayment(pending.status);
          if (pending.kind === "take") void applyAssignedAgent(viewingAgentId);
          if (pending.kind === "move") void applyAssignedAgent(pending.agentId);
        }}
      />
    </div>
  );
}
