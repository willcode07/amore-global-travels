"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageThread } from "@/components/MessageThread";
import { StatusTracker } from "@/components/StatusTracker";
import { statusLabels } from "@/lib/agents";
import { lookupRequest, updateRequest } from "@/lib/requests";
import { TravelRequest } from "@/lib/types";

function DashboardInner() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [request, setRequest] = useState<TravelRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    const phoneParam = searchParams.get("phone") ?? "";
    const codeParam = searchParams.get("code") ?? "";
    if (phoneParam && codeParam) {
      setPhone(phoneParam);
      setAccessCode(codeParam);
      void lookup(phoneParam, codeParam);
      return;
    }

    const saved = localStorage.getItem("amore_last_access");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { phone: string; accessCode: string };
        setPhone(parsed.phone);
        setAccessCode(parsed.accessCode);
      } catch {
        // ignore bad local storage
      }
    }
    // Initial hydrate from URL / localStorage only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function lookup(nextPhone = phone, nextCode = accessCode) {
    setLoading(true);
    setError("");
    try {
      const found = lookupRequest(nextPhone, nextCode);
      setRequest(found);
      localStorage.setItem(
        "amore_last_access",
        JSON.stringify({ phone: nextPhone, accessCode: nextCode }),
      );
    } catch (err) {
      setRequest(null);
      setError(err instanceof Error ? err.message : "Unable to find trip.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    await lookup();
  }

  async function selectOption(optionId: string) {
    if (!request) return;
    setSelecting(optionId);
    try {
      const updated = updateRequest(request.id, { selectedOptionId: optionId });
      setRequest(updated);
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
          Track your request, review options, and message your agent — all in one
          place. Email alerts will nudge you back here when something updates.
        </p>
      </div>

      {!request && (
        <form
          onSubmit={handleLogin}
          className="max-w-xl space-y-4 rounded-3xl border border-line bg-surface p-6 md:p-8"
        >
          <h2 className="font-display text-2xl text-ink">Access your trip</h2>
          <p className="text-sm text-muted">
            Use the phone number and access code from your confirmation email.
          </p>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Phone number</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Access code</span>
            <input
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
              className="w-full rounded-xl border border-line px-4 py-3 uppercase tracking-[0.2em] outline-none ring-gold focus:ring-2"
              required
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {loading ? "Opening..." : "Open dashboard"}
          </button>
        </form>
      )}

      {request && (
        <div className="space-y-8">
          <div className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl text-ink">
                  {request.trip.destination}
                </h2>
                <p className="mt-1 text-muted">
                  {request.traveler.fullName} · {request.trip.travelWindow}
                </p>
              </div>
              <div className="rounded-full bg-cream px-4 py-2 text-sm font-semibold text-gold-deep">
                {statusLabels[request.status]}
              </div>
            </div>
            <div className="mt-8">
              <StatusTracker status={request.status} />
            </div>
            {request.status === "booking_confirmed" && (
              <p className="mt-6 rounded-2xl bg-cream px-4 py-3 text-sm text-ink">
                Booking confirmed. Official vendor confirmations are sent by email.
                This dashboard closes the loop so you always know where things stand.
              </p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
              <h3 className="font-display text-2xl text-ink">Your request</h3>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <Item label="Travelers" value={String(request.trip.travelers)} />
                <Item label="Budget" value={request.trip.budget || "—"} />
                <Item label="Departure city" value={request.trip.departureCity || "—"} />
                <Item label="Preferred agent" value={request.trip.preferredAgent} />
                <Item
                  label="Trip style"
                  value={request.trip.tripStyle.join(", ") || "—"}
                />
                <Item label="Access code" value={request.accessCode} />
              </dl>
              {request.trip.preferences && (
                <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm text-ink">
                  {request.trip.preferences}
                </p>
              )}
            </section>

            <MessageThread
              messages={request.messages}
              sender="traveler"
              senderName={request.traveler.fullName}
              requestId={request.id}
              onSent={(messages) => setRequest({ ...request, messages })}
            />
          </div>

          <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl text-ink">Travel options</h3>
                <p className="mt-1 text-sm text-muted">
                  Review the options your agent prepared, then select the one you
                  want to move forward with.
                </p>
              </div>
              <button
                type="button"
                onClick={() => lookup()}
                className="text-sm font-semibold text-gold-deep"
              >
                Refresh
              </button>
            </div>

            {request.options.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-cream px-4 py-5 text-sm text-muted">
                No options yet. Your agent is researching based on your request.
                You&apos;ll get an email when options are ready.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {request.options.map((option) => {
                  const selected = request.selectedOptionId === option.id;
                  return (
                    <article
                      key={option.id}
                      className={`rounded-3xl border p-5 ${
                        selected
                          ? "border-gold bg-cream"
                          : "border-line bg-[#faf8f4]"
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
                          View flyer / itinerary
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={selected || selecting === option.id}
                        onClick={() => selectOption(option.id)}
                        className="mt-5 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
                      >
                        {selected
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

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setRequest(null);
                setError("");
              }}
              className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink"
            >
              Sign out of dashboard
            </button>
            <Link
              href="/?start=1"
              className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink"
            >
              Start another request
            </Link>
          </div>
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
