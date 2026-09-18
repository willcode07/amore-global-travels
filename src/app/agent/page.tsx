"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AgentClientDetails } from "@/components/AgentClientDetails";
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
  paymentLabels,
  paymentOrder,
  tripTypeLabels,
} from "@/lib/agents";
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

const AGENT_KEY = "amore_agent_unlocked";
const VIEWING_AS_KEY = "amore_agent_viewing_as";

type QueueSort = "assigned" | "agent" | "traveler";

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
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<DemoNotification[]>([]);
  const [viewingAgentId, setViewingAgentId] = useState(defaultAssignedAgentId);
  const [viewingAgentInitialized, setViewingAgentInitialized] = useState(false);
  const [onlyMyAssignments, setOnlyMyAssignments] = useState(false);
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
    if (localStorage.getItem(AGENT_KEY) === "1") {
      setUnlocked(true);
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
    const stored = localStorage.getItem(VIEWING_AS_KEY);
    const next = normalizeAssignedAgentId(stored);
    if (stored !== next) localStorage.setItem(VIEWING_AS_KEY, next);
    setViewingAgentId(next);
    setViewingAgentInitialized(true);
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked || !viewingAgentInitialized) return;
    const unread = readAgentAssignmentNotifications(viewingAgentId);
    setUnreadAssignmentIds(unread);
    setAssignmentAlerts(agentAssignmentNotifications(viewingAgentId));
  }, [unlocked, viewingAgentId, viewingAgentInitialized]);

  async function loadRequests() {
    try {
      const next = await listRequests();
      setRequests(next);
      setNotes(readNotifications());
      if (!selectedId && next[0]) {
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
    localStorage.setItem(AGENT_KEY, "1");
    setUnlocked(true);
  }

  async function handleSignOut() {
    localStorage.removeItem(AGENT_KEY);
    if (isApiBackend()) {
      resetApiAuthCache();
      await logoutApiSession();
    }
    setUnlocked(false);
    setRequests([]);
    setViewingAgentInitialized(false);
    setOtpSent(false);
    setOtpCode("");
    setDemoCode("");
  }

  async function updateStatus(status: RequestStatus) {
    if (!selected) return;
    if (journeyStageIndex(selected.status) === journeyStageIndex(status)) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, { status });
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setSaving(false);
    }
  }

  async function updatePayment(status: PaymentStatus) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateRequest(selected.id, {
        paymentStatus: status,
        ...(status === "paid"
          ? { paidAt: selected.paidAt || todayInputDate() }
          : {}),
        ...(status === "refunded"
          ? { refundedAt: selected.refundedAt || todayInputDate() }
          : {}),
      });
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update payment.");
    } finally {
      setSaving(false);
    }
  }

  async function savePaymentPlan(input: {
    paymentPlanType: PaymentPlanType;
    paymentSchedule: InstallmentPayment[];
  }) {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        paymentPlanType: input.paymentPlanType,
        paymentSchedule: input.paymentSchedule,
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

  async function updateAssignedAgent(assignedAgentId: string) {
    if (!selected) return;
    const nextAgentId = normalizeAssignedAgentId(assignedAgentId);
    if (selected.assignedAgentId === nextAgentId) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, { assignedAgentId: nextAgentId });
      recordAgentAssignment(updated, updated.assignedAgentId);
      await loadRequests();
      setSelectedId(updated.id);
      refreshAssignmentAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reassign this travel quote.");
    } finally {
      setSaving(false);
    }
  }

  async function savePaymentDetails() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        paymentNote: paymentNote.trim(),
        ...(selected.paymentStatus === "paid" ? { paidAt: paymentDate } : {}),
        ...(selected.paymentStatus === "refunded" ? { refundedAt: paymentDate } : {}),
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
    if (!selected) return;
    const previousAgentId = selected.assignedAgentId;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        intake: toTripIntake(data, tripType, selected.intake?.completedAt),
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
    if (!selected) return;
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
      const updated = await updateRequest(selected.id, { quote });
      setComposing(false);
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
                Simple passcode gate for the local / GitHub Pages demo.
              </p>
              <input
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                type="password"
                placeholder="Agent passcode"
                className="mt-6 w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
              />
            </>
          )}
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className="mt-4 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold"
          >
            {isApiBackend() && !otpSent ? "Send code" : "Enter inbox"}
          </button>
          {!isApiBackend() ? (
            <p className="mt-4 text-xs text-muted">
              Default local passcode: <code>amore-agents</code>
            </p>
          ) : null}
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
            Review traveler details, build a verified quote, track payment, and keep
            the traveler informed in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink">
            <span className="text-muted">Viewing as</span>
            <select
              value={viewingAgentId}
              onChange={(event) => {
                const next = normalizeAssignedAgentId(event.target.value);
                localStorage.setItem(VIEWING_AS_KEY, next);
                setViewingAgentId(next);
              }}
              className="bg-transparent text-sm font-semibold outline-none"
              aria-label="Viewing agent"
            >
              {assignableAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
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
            Assigned to me
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
        <section className="mb-6 rounded-3xl border border-line bg-cream px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-display text-xl text-ink">Notifications</h2>
              <p className="mt-1 text-sm text-muted">
                {unreadAssignmentIds.length
                  ? `${unreadAssignmentIds.length} new assignment${
                      unreadAssignmentIds.length === 1 ? "" : "s"
                    } for ${agentNameForId(viewingAgentId)}.`
                  : `Recent assignments for ${agentNameForId(viewingAgentId)}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={clearNotifications}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
            >
              Clear notifications
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
        </section>
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
              <p className="px-2 py-4 text-sm text-muted">No requests yet.</p>
            )}
            {filtered.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => {
                  setSelectedId(request.id);
                  setComposing(false);
                }}
                className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                  selectedId === request.id ? "bg-cream" : "hover:bg-cream/60"
                } ${request.assignedAgentId === viewingAgentId ? "ring-1 ring-gold" : ""}`}
              >
                <div className="font-semibold text-ink">{quoteAssignmentTitle(request)}</div>
                <div className="mt-1 text-xs text-muted">
                  Agent: {agentNameForId(request.assignedAgentId)}
                  {request.assignedAgentId === viewingAgentId ? " · Assigned to me" : ""}
                </div>
                <div className="mt-1 text-xs font-medium text-gold-deep">
                  {tripStatusTitle(request.status)}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {!selected ? (
          <div className="rounded-3xl border border-line bg-surface p-8 text-muted">
            Select a trip to manage it, or open client forms to create one.
          </div>
        ) : composing ? (
          <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <QuoteComposer
              request={selected}
              saving={saving}
              onPublish={publishQuote}
              onCancel={() => setComposing(false)}
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
                    <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                      Reassign
                      <select
                        value={selected.assignedAgentId}
                        disabled={saving}
                        onChange={(event) => void updateAssignedAgent(event.target.value)}
                        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink outline-none ring-gold focus:ring-2"
                        aria-label="Reassign this travel quote"
                      >
                        {assignableAgents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <StatusTracker status={selected.status} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {tripStatusSteps.map((step, index) => {
                  const active = journeyStageIndex(selected.status) === index;
                  return (
                    <button
                      key={step.title}
                      type="button"
                      disabled={saving}
                      onClick={() => updateStatus(statusForJourneyStage(index))}
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
                      disabled={saving}
                      onClick={() => updatePayment(status)}
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
                editable
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
                    disabled={saving}
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
                  if (!selected) return;
                  setSaving(true);
                  try {
                    const updated = await updateRequest(selected.id, {
                      clienteaseRef: clienteaseRef.trim() || null,
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
                  disabled={saving}
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
                    Opens a draft from this traveler’s request. Preview live, then
                    confirm and send — the traveler reviews it like any other quote.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setComposing(true)}
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
            </section>

            <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
              <h3 className="font-display text-2xl text-ink">Canva / media flyer</h3>
              <p className="mt-1 text-sm text-muted">
                Attach a Canva link, PDF, or image inside a normal quote draft. It
                uses the same live preview, Quality Check, and traveler quote flow as
                every generated quote.
              </p>
              <button
                type="button"
                onClick={() => setComposing(true)}
                className="mt-5 rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add a flyer to a quote
              </button>
              {selected.options.length > 0 ? (
                <p className="mt-4 text-xs text-muted">
                  Previously shared simple options remain available to the traveler;
                  new media always follows the verified quote workflow above.
                </p>
              ) : null}
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
    </div>
  );
}
