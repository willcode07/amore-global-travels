"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageThread } from "@/components/MessageThread";
import { QuoteDocument } from "@/components/QuoteDocument";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { StatusTracker } from "@/components/StatusTracker";
import { paymentLabels, tripTypeLabels } from "@/lib/agents";
import { isApiBackend } from "@/lib/data/mode";
import { journeyStageTitle } from "@/lib/journey";
import { notificationsForTraveler } from "@/lib/notifications";
import { lookupTraveler, updateRequest } from "@/lib/requests";
import { clearSession, readSession, writeSession } from "@/lib/session";
import { logoutApiSession, postJson } from "@/lib/uploads";
import { DemoNotification, TravelRequest } from "@/lib/types";

function DashboardInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [trips, setTrips] = useState<TravelRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState<string | null>(null);
  const [notes, setNotes] = useState<DemoNotification[]>([]);
  const [ready, setReady] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [demoCode, setDemoCode] = useState("");

  const selected = useMemo(
    () => trips.find((trip) => trip.id === selectedId) ?? null,
    [trips, selectedId],
  );

  useEffect(() => {
    const saved = readSession();
    const emailParam = searchParams.get("email") ?? saved?.email ?? "";
    const phoneParam = searchParams.get("phone") ?? saved?.phone ?? "";
    setEmail(emailParam);
    setPhone(phoneParam);

    async function boot() {
      if (isApiBackend()) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/me`, {
            credentials: "include",
          });
          if (res.ok) {
            const me = (await res.json()) as { role?: string; email?: string; phone?: string };
            if (me.role === "traveler" && me.email && me.phone) {
              setEmail(me.email);
              setPhone(me.phone);
              await lookup(me.email, me.phone, searchParams.get("trip"));
              setReady(true);
              return;
            }
          }
        } catch {
          /* stay on login */
        }
        setReady(true);
        return;
      }
      if (emailParam && phoneParam) {
        await lookup(emailParam, phoneParam, searchParams.get("trip"));
      }
      setReady(true);
    }

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function lookup(nextEmail = email, nextPhone = phone, tripId?: string | null) {
    setLoading(true);
    setError("");
    try {
      const found = await lookupTraveler(nextEmail, nextPhone);
      setTrips(found);
      writeSession({
        fullName: found[0]?.traveler.fullName ?? "",
        email: nextEmail,
        phone: nextPhone,
      });
      setNotes(notificationsForTraveler(nextEmail));
      const fromUrl = tripId
        ? found.find((trip) => trip.id === tripId)
        : undefined;
      setSelectedId(fromUrl?.id ?? found[0]?.id ?? null);
    } catch (err) {
      setTrips([]);
      setSelectedId(null);
      setError(err instanceof Error ? err.message : "Unable to find trips.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (isApiBackend()) {
      try {
        setLoading(true);
        if (!otpSent) {
          const data = await postJson<{ demoCode?: string }>("/api/auth/traveler/otp", {
            email,
            phone,
          });
          setOtpSent(true);
          setDemoCode(data.demoCode ?? "");
          return;
        }
        await postJson("/api/auth/traveler/verify", { email, phone, code: otpCode });
        await lookup();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to sign in.");
      } finally {
        setLoading(false);
      }
      return;
    }
    lookup();
  }

  function refresh() {
    if (!email || !phone) return;
    lookup();
  }

  async function selectQuote(quoteId: string) {
    if (!selected) return;
    setSelecting(quoteId);
    try {
      await updateRequest(selected.id, { selectedQuoteId: quoteId });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to select quote.");
    } finally {
      setSelecting(null);
    }
  }

  async function selectOption(optionId: string) {
    if (!selected) return;
    setSelecting(optionId);
    try {
      await updateRequest(selected.id, { selectedOptionId: optionId });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to select option.");
    } finally {
      setSelecting(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
          Traveler hub
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink md:text-5xl">
          Your travel dashboard
        </h1>
        <p className="mt-3 text-muted">
          Every quote under your email and phone, in one place. When your agent
          sends a message or a proposal, we email you and keep the history here.
        </p>
      </div>

      {!ready && (
        <p className="rounded-2xl bg-cream px-4 py-5 text-sm text-muted">
          Opening your trips...
        </p>
      )}

      {ready && trips.length === 0 && (
        <form
          onSubmit={handleLogin}
          className="max-w-xl space-y-4 rounded-3xl border border-line bg-surface p-6 md:p-8"
        >
          <h2 className="font-display text-2xl text-ink">Open your trips</h2>
          <p className="text-sm text-muted">
            {isApiBackend()
              ? "Use the email and phone from your request. We’ll email a one-time code — or show a demo code if mail isn’t configured yet."
              : "Use the email and phone number from your request. That pairing is your login — no access code to keep track of."}
          </p>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Phone number</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
              required
            />
          </label>
          {isApiBackend() && otpSent ? (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Email code</span>
              <input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                inputMode="numeric"
                className="w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
                required
              />
            </label>
          ) : null}
          {demoCode ? (
            <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink">
              Demo code (Resend not configured): <strong>{demoCode}</strong>
            </p>
          ) : null}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : isApiBackend() && !otpSent
                ? "Send code"
                : "Open dashboard"}
          </button>
        </form>
      )}

      {ready && trips.length > 0 && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Signed in as {trips[0].traveler.fullName} · {trips.length} trip
              {trips.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap gap-2">
              <StartTravelButton className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-on-gold">
                Plan another trip
              </StartTravelButton>
              <button
                type="button"
                onClick={async () => {
                  clearSession();
                  if (isApiBackend()) await logoutApiSession();
                  setTrips([]);
                  setSelectedId(null);
                  setError("");
                  setOtpSent(false);
                  setOtpCode("");
                  setDemoCode("");
                }}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                onClick={() => setSelectedId(trip.id)}
                className={`rounded-3xl border p-5 text-left transition ${
                  selectedId === trip.id
                    ? "border-gold bg-cream"
                    : "border-line bg-surface hover:border-gold/50"
                }`}
              >
                <div className="font-display text-xl text-ink">{trip.trip.destination}</div>
                <p className="mt-1 text-sm text-muted">{trip.trip.travelWindow}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-gold-deep">
                  {journeyStageTitle(trip.status)}
                </p>
              </button>
            ))}
          </div>

          {notes.length > 0 && (
            <section className="rounded-3xl border border-line bg-surface p-5 no-print">
              <h3 className="font-display text-xl text-ink">Email alerts</h3>
              <p className="mt-1 text-sm text-muted">
                Demo mode stores what would be emailed. Every agent message sends an
                alert.
              </p>
              <ul className="mt-4 space-y-3">
                {notes.slice(0, 4).map((note) => (
                  <li key={note.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
                    <div className="font-medium text-ink">{note.subject}</div>
                    <p className="mt-1 whitespace-pre-wrap text-muted">
                      {note.text.slice(0, 220)}
                      {note.text.length > 220 ? "…" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {selected && (
            <div className="space-y-8">
              <div className="rounded-3xl border border-line bg-surface p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-3xl text-ink">
                      {selected.trip.destination}
                    </h2>
                    <p className="mt-1 text-muted">
                      {selected.traveler.fullName} · {selected.trip.travelWindow}
                    </p>
                  </div>
                  <div className="rounded-full bg-cream px-4 py-2 text-sm font-semibold text-gold-deep">
                    {journeyStageTitle(selected.status)}
                  </div>
                </div>
                <div className="mt-8">
                  <StatusTracker status={selected.status} />
                </div>
                {selected.status === "booking_confirmed" && (
                  <p className="mt-6 rounded-2xl bg-cream px-4 py-3 text-sm text-ink">
                    Booking confirmed. Official vendor confirmations are sent by email.
                  </p>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
                  <h3 className="font-display text-2xl text-ink">Your request</h3>
                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                    <Item label="Travelers" value={String(selected.trip.travelers)} />
                    <Item label="Budget" value={selected.trip.budget || "—"} />
                    <Item
                      label="Trip type"
                      value={tripTypeLabels[selected.trip.tripType] ?? selected.trip.tripType}
                    />
                    <Item
                      label="Departure city"
                      value={selected.trip.departureCity || "—"}
                    />
                    <Item label="Preferred agent" value={selected.trip.preferredAgent || "—"} />
                    <Item
                      label="Payment"
                      value={paymentLabels[selected.paymentStatus] ?? selected.paymentStatus}
                    />
                    <Item
                      label="Trip style"
                      value={selected.trip.tripStyle.join(", ") || "—"}
                    />
                  </dl>
                  {selected.trip.preferences && (
                    <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm text-ink">
                      {selected.trip.preferences}
                    </p>
                  )}
                </section>

                <MessageThread
                  messages={selected.messages}
                  sender="traveler"
                  senderName={selected.traveler.fullName}
                  requestId={selected.id}
                  onSent={() => refresh()}
                />
              </div>

              <section className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-3 no-print">
                  <div>
                    <h3 className="font-display text-2xl text-ink">Your quotes</h3>
                    <p className="mt-1 text-sm text-muted">
                      Review the proposal your agent prepared, then choose the one you
                      want to move forward with.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => refresh()}
                    className="text-sm font-semibold text-gold-deep"
                  >
                    Refresh
                  </button>
                </div>

                {selected.quotes.length === 0 && selected.options.length === 0 ? (
                  <p className="rounded-2xl bg-cream px-4 py-5 text-sm text-muted">
                    No quotes yet. Your agent is researching based on your request.
                    You&apos;ll get an email when a proposal is ready.
                  </p>
                ) : null}

                {selected.quotes.map((quote) => {
                  const chosen = selected.selectedQuoteId === quote.id;
                  return (
                    <div key={quote.id} className="space-y-4">
                      <QuoteDocument quote={quote} request={selected} />
                      <div className="flex flex-wrap gap-3 no-print">
                        <button
                          type="button"
                          disabled={chosen || selecting === quote.id}
                          onClick={() => selectQuote(quote.id)}
                          className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-on-brand disabled:opacity-60"
                        >
                          {chosen
                            ? "Selected"
                            : selecting === quote.id
                              ? "Saving..."
                              : "This is the one I want"}
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
                        >
                          Print / save as PDF
                        </button>
                        {quote.flyerUrl ? (
                          <a
                            href={quote.flyerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
                          >
                            Open flyer
                          </a>
                        ) : null}
                        {quote.pdfUrl ? (
                          <a
                            href={quote.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
                          >
                            Download quote PDF
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {selected.options.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selected.options.map((option) => {
                      const chosen = selected.selectedOptionId === option.id;
                      return (
                        <article
                          key={option.id}
                          className={`rounded-3xl border p-5 ${
                            chosen ? "border-gold bg-cream" : "border-line bg-surface"
                          }`}
                        >
                          <h4 className="font-display text-xl text-ink">{option.title}</h4>
                          <p className="mt-1 text-sm font-semibold text-gold-deep">
                            {option.estimatedPrice || "Price on request"}
                          </p>
                          <p className="mt-3 text-sm text-muted">{option.summary}</p>
                          {option.highlights.length > 0 && (
                            <ul className="mt-4 space-y-1 text-sm text-ink">
                              {option.highlights.map((highlight) => (
                                <li key={highlight}>• {highlight}</li>
                              ))}
                            </ul>
                          )}
                          {option.flyerUrl && (
                            <a
                              href={option.flyerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-4 inline-block text-sm font-semibold text-gold-deep underline"
                            >
                              View flyer
                            </a>
                          )}
                          <button
                            type="button"
                            disabled={chosen || selecting === option.id}
                            onClick={() => selectOption(option.id)}
                            className="mt-5 w-full rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand disabled:opacity-60"
                          >
                            {chosen
                              ? "Selected"
                              : selecting === option.id
                                ? "Saving..."
                                : "Select this option"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value}</dd>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-muted">Loading dashboard...</div>}>
      <DashboardInner />
    </Suspense>
  );
}
