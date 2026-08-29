"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClientIntakeForms } from "@/components/ClientIntakeForms";
import { FileUploadField } from "@/components/FileUploadField";
import { MessageThread } from "@/components/MessageThread";
import { QuoteComposer } from "@/components/QuoteComposer";
import { QuoteDocument } from "@/components/QuoteDocument";
import { StatusTracker } from "@/components/StatusTracker";
import {
  paymentLabels,
  paymentOrder,
  statusLabels,
  statusOrder,
  tripTypeLabels,
} from "@/lib/agents";
import { confirmedTripsToCsv, downloadCsv, requestsToCsv } from "@/lib/csv";
import { isApiBackend } from "@/lib/data/mode";
import { resetApiAuthCache } from "@/lib/data/session-cache";
import { readNotifications } from "@/lib/notifications";
import { listRequests, updateRequest } from "@/lib/requests";
import { emailsMatch, phonesMatch } from "@/lib/session";
import { site } from "@/lib/site";
import { logoutApiSession, postJson } from "@/lib/uploads";
import {
  DemoNotification,
  PaymentStatus,
  RequestStatus,
  TravelProposal,
  TravelRequest,
} from "@/lib/types";

const AGENT_KEY = "amore_agent_unlocked";

export default function AgentPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoCode, setDemoCode] = useState("");
  const [clienteaseRef, setClienteaseRef] = useState("");
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showClientForms, setShowClientForms] = useState(false);
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<DemoNotification[]>([]);

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return requests;
    return requests.filter((request) =>
      [
        request.traveler.fullName,
        request.traveler.email,
        request.traveler.phone,
        request.trip.destination,
        request.tripRef,
        request.trip.tripType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, requests]);

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
  }, [selected?.id, selected?.clienteaseRef]);

  useEffect(() => {
    if (!unlocked) return;
    void loadRequests();
    setNotes(readNotifications().filter((note) => note.to.includes("@")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

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
    setOtpSent(false);
    setOtpCode("");
    setDemoCode("");
  }

  async function updateStatus(status: RequestStatus) {
    if (!selected) return;
    if (selected.status === status) return;
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
      const updated = await updateRequest(selected.id, { paymentStatus: status });
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update payment.");
    } finally {
      setSaving(false);
    }
  }

  async function addOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const updated = await updateRequest(selected.id, {
        option: {
          title: String(form.get("title") ?? ""),
          summary: String(form.get("summary") ?? ""),
          estimatedPrice: String(form.get("estimatedPrice") ?? ""),
          highlights: String(form.get("highlights") ?? ""),
          flyerUrl: String(form.get("flyerUrl") ?? ""),
        },
      });
      event.currentTarget.reset();
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add option.");
    } finally {
      setSaving(false);
    }
  }

  async function publishQuote(quote: TravelProposal) {
    if (!selected) return;
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
            className="mt-4 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-brand"
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
            Agent tools
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Travel request inbox</h1>
          <p className="mt-2 max-w-2xl text-muted">
            One row per trip. Publish a written quote, update payment, and export
            a CSV for ClientEase. Traveler emails fire on every message.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            onClick={() =>
              downloadCsv(
                `amore-clientease-${Date.now()}.csv`,
                confirmedTripsToCsv(requests),
              )
            }
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          >
            Export confirmed for ClientEase
          </button>
          <button
            type="button"
            onClick={() => setShowClientForms((open) => !open)}
            className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-brand"
          >
            {showClientForms ? "Hide client forms" : "Open client forms"}
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

      {showClientForms && (
        <section className="mb-10 rounded-3xl bg-cream p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-ink">
                Contact Us &amp; Request a Quote
              </h2>
              <p className="mt-1 text-sm text-muted">
                Expanded fillable forms for post-call intake. PDFs go to {site.email};
                quote submits also land in this inbox.
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
          <ClientIntakeForms
            createInboxRequest
            onQuoteCreated={() => {
              void loadRequests();
            }}
          />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-line bg-surface p-4">
          <h2 className="px-2 font-display text-xl text-ink">Trips</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, destination, trip ref"
            className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-gold focus:ring-2"
          />
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
                }`}
              >
                <div className="font-semibold text-ink">{request.traveler.fullName}</div>
                <div className="text-sm text-muted">{request.trip.destination}</div>
                <div className="mt-1 text-xs font-medium text-gold-deep">
                  {request.tripRef} · {statusLabels[request.status]}
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
                    {selected.trip.destination}
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
                </div>
                <div className="rounded-full bg-cream px-4 py-2 text-sm font-semibold text-gold-deep">
                  {selected.tripRef}
                </div>
              </div>

              <div className="mt-6">
                <StatusTracker status={selected.status} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {statusOrder.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={saving}
                    onClick={() => updateStatus(status)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      selected.status === status
                        ? "bg-gold text-brand"
                        : "border border-line bg-surface text-muted"
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {paymentOrder.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={saving}
                    onClick={() => updatePayment(status)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      selected.paymentStatus === status
                        ? "bg-brand text-cream"
                        : "border border-line bg-surface text-muted"
                    }`}
                  >
                    {paymentLabels[status]}
                  </button>
                ))}
              </div>

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
                  <dd className="font-medium">{selected.trip.travelers}</dd>
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
              {selected.trip.preferences && (
                <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-cream px-4 py-3 text-sm">
                  {selected.trip.preferences}
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-ink">Written quote</h3>
                  <p className="mt-1 text-sm text-muted">
                    Build a proposal the traveler can review, print, and select — or
                    paste a Canva flyer as a simple option below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setComposing(true)}
                  className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-brand"
                >
                  {selected.quotes.length ? "Add another quote" : "Build quote"}
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
              <h3 className="font-display text-2xl text-ink">Simple option / flyer</h3>
              <p className="mt-1 text-sm text-muted">
                Use this when you already designed the option in Canva.
              </p>
              <form onSubmit={addOption} className="mt-5 grid gap-3">
                <input
                  name="title"
                  required
                  placeholder="Option title (e.g. Santorini Resort Package)"
                  className="rounded-xl border border-line px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
                />
                <input
                  name="estimatedPrice"
                  placeholder="Estimated price"
                  className="rounded-xl border border-line px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
                />
                <textarea
                  name="summary"
                  required
                  rows={3}
                  placeholder="Short summary of this option"
                  className="rounded-xl border border-line px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
                />
                <textarea
                  name="highlights"
                  rows={3}
                  placeholder={"Highlights (one per line)\nBreakfast included\n3 nights hotel"}
                  className="rounded-xl border border-line px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
                />
                <input
                  name="flyerUrl"
                  type="url"
                  placeholder="Canva / flyer URL (optional)"
                  className="rounded-xl border border-line px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
                />
                <FileUploadField
                  tripId={selected.id}
                  kind="flyer"
                  label="Or upload a flyer / PDF"
                  onUploaded={(url) => {
                    const field = document.querySelector<HTMLInputElement>(
                      'input[name="flyerUrl"]',
                    );
                    if (field) field.value = url;
                  }}
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="w-fit rounded-full bg-gold px-5 py-3 text-sm font-semibold text-brand disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Publish option to traveler"}
                </button>
              </form>

              {selected.options.length > 0 && (
                <div className="mt-6 space-y-3">
                  {selected.options.map((option) => (
                    <div key={option.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
                      <div className="font-semibold text-ink">{option.title}</div>
                      <div className="text-gold-deep">{option.estimatedPrice}</div>
                      <p className="mt-1 text-muted">{option.summary}</p>
                    </div>
                  ))}
                </div>
              )}
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
                <h3 className="font-display text-xl text-ink">Recent alerts</h3>
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
