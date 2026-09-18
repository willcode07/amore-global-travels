"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActivityLog } from "@/components/ActivityLog";
import { MessageThread } from "@/components/MessageThread";
import { PaymentPlanPanel } from "@/components/PaymentPlanPanel";
import { PhoneField } from "@/components/PhoneField";
import { QuoteDocument } from "@/components/QuoteDocument";
import { QuoteIntakeForm } from "@/components/QuoteIntakeForm";
import { StartTravelButton } from "@/components/RequestModalProvider";
import { StatusTracker } from "@/components/StatusTracker";
import { StatusBadge } from "@/components/TripStatus";
import {
  paymentLabels,
  tripTypeLabels,
} from "@/lib/agents";
import { paymentPlanTypeLabels, scheduleSummary } from "@/lib/payments";
import { buildTripActivity } from "@/lib/activity";
import { isApiBackend } from "@/lib/data/mode";
import { proposalFromOption } from "@/lib/quotes";
import {
  formatDisplayDate,
  formatIntakeAddress,
  formatPartySummary,
  formatRequestParty,
  isIntakeComplete,
  QuoteIntakeFields,
  quoteDefaultsFromRequest,
  toTripIntake,
} from "@/lib/intake";
import { tripStatusSteps } from "@/lib/journey";
import { logDashboardLogin, notificationsForTraveler } from "@/lib/notifications";
import { lookupTraveler, updateRequest, addMessage } from "@/lib/requests";
import { clearSession, readSession, writeSession } from "@/lib/session";
import { logoutApiSession, postJson } from "@/lib/uploads";
import { DemoNotification, TravelRequest, TripType } from "@/lib/types";

function nextStepCopy(trip: TravelRequest) {
  if (trip.status === "booking_confirmed") {
    return tripStatusSteps[2].text;
  }
  if (trip.selectedQuoteId || trip.selectedOptionId) {
    return isIntakeComplete(trip)
      ? "You chose an option. Your agent will confirm the trip."
      : "You chose an option. Add traveler names, birth dates, and address so booking can move forward.";
  }
  if (trip.quotes.length > 0 || trip.options.length > 0) {
    return isIntakeComplete(trip)
      ? tripStatusSteps[1].text
      : "Your quote is ready. Add trip details before you confirm — names, birth dates, and address.";
  }
  return "Your agent has this request and will follow up, usually within 24 hours.";
}

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
  const [editingIntake, setEditingIntake] = useState(false);
  const [savingIntake, setSavingIntake] = useState(false);
  const [pendingDetailsScroll, setPendingDetailsScroll] = useState(false);

  const selected = useMemo(
    () => trips.find((trip) => trip.id === selectedId) ?? null,
    [trips, selectedId],
  );

  const activity = useMemo(
    () => (selected ? buildTripActivity(selected, notes) : []),
    [selected, notes],
  );

  const intakeComplete = selected ? isIntakeComplete(selected) : false;
  const showIntakeForm = Boolean(selected && editingIntake);

  useEffect(() => {
    if (!pendingDetailsScroll || !showIntakeForm) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("trip-details")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingDetailsScroll(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingDetailsScroll, showIntakeForm, selectedId]);

  function goToTripDetails(tripId?: string) {
    if (tripId && tripId !== selectedId) {
      setSelectedId(tripId);
    }
    setEditingIntake(true);
    setPendingDetailsScroll(true);
  }

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
              await lookup(me.email, me.phone, {
                tripId: searchParams.get("trip"),
                logLogin: true,
              });
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
        await lookup(emailParam, phoneParam, {
          tripId: searchParams.get("trip"),
          logLogin: true,
        });
      }
      setReady(true);
    }

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function lookup(
    nextEmail = email,
    nextPhone = phone,
    options: { tripId?: string | null; logLogin?: boolean } = {},
  ) {
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
      if (options.logLogin) logDashboardLogin(nextEmail);
      setNotes(notificationsForTraveler(nextEmail));
      const fromUrl = options.tripId
        ? found.find((trip) => trip.id === options.tripId)
        : undefined;
      setSelectedId(fromUrl?.id ?? found[0]?.id ?? null);
    } catch (err) {
      setTrips([]);
      setSelectedId(null);
      setError(err instanceof Error ? err.message : "Unable to find quotes.");
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
          await postJson<{ demoCode?: string }>("/api/auth/traveler/otp", {
            email,
            phone,
          });
          setOtpSent(true);
          return;
        }
        await postJson("/api/auth/traveler/verify", { email, phone, code: otpCode });
        await lookup(email, phone, { logLogin: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to sign in.");
      } finally {
        setLoading(false);
      }
      return;
    }
    lookup(email, phone, { logLogin: true });
  }

  function refresh() {
    if (!email || !phone) return;
    lookup(email, phone);
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

  async function saveIntake(data: QuoteIntakeFields, tripType: TripType) {
    if (!selected) return;
    const firstCompletion = !selected.intake?.completedAt;
    setSavingIntake(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        intake: toTripIntake(data, tripType, selected.intake?.completedAt),
      });
      if (firstCompletion) {
        await addMessage(selected.id, {
          sender: "traveler",
          senderName: updated.traveler.fullName,
          body: "hi! my Travel details form has been submitted. let me know if you have any other questions before organizing my quote.",
        });
      }
      setEditingIntake(false);
      refresh();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Unable to save trip details.");
    } finally {
      setSavingIntake(false);
    }
  }

  const firstName = trips[0]?.traveler.fullName.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl text-ink md:text-5xl">Your Dashboard</h1>
          <p className="mt-3 text-muted">
            Every trip in one place — see when your quote is ready, message your
            agent, and keep the history.
          </p>
        </div>
        {trips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
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
              }}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      {!ready && (
        <p className="rounded-2xl border border-line bg-surface px-4 py-5 text-sm text-muted">
          Opening your quotes…
        </p>
      )}

      {ready && trips.length === 0 && (
        <form
          onSubmit={handleLogin}
          className="max-w-md space-y-4 rounded-3xl border border-line bg-surface p-6 md:p-8"
        >
          <h2 className="font-display text-2xl text-ink">Sign in</h2>
          <p className="text-sm text-muted">
            Use the email and phone from your quote request.
          </p>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
              required
            />
          </label>
          <PhoneField
            label="Phone number"
            value={phone}
            onChange={setPhone}
            required
          />
          {isApiBackend() && otpSent ? (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Email code</span>
              <input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
                required
              />
            </label>
          ) : null}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : isApiBackend() && !otpSent
                ? "Send code"
                : "Open dashboard"}
          </button>
        </form>
      )}

      {ready && trips.length > 0 && (
        <div className="space-y-8">
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl text-ink">Your Quotes</h2>
              <p className="text-sm text-muted">
                Hi, {firstName}
                {trips.length > 1
                  ? ` · ${trips.length} quote${trips.length === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => {
                const active = selectedId === trip.id;
                return (
                  <article
                    key={trip.id}
                    className={`rounded-2xl border p-5 text-left transition ${
                      active
                        ? "border-gold bg-cream shadow-[var(--shadow-soft)]"
                        : "border-line bg-surface hover:border-gold/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(trip.id);
                        setEditingIntake(false);
                      }}
                      className="w-full text-left"
                    >
                      <div className="font-display text-xl text-ink">{trip.trip.destination}</div>
                      <p className="mt-1 text-sm text-muted">{trip.trip.travelWindow}</p>
                      <div className="mt-4">
                        <StatusBadge status={trip.status} />
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="space-y-6">
              <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-3xl text-ink">
                      {selected.trip.destination}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {selected.trip.travelWindow}
                      {selected.trip.travelers
                        ? ` · ${formatRequestParty(selected)}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="mt-8">
                  <StatusTracker status={selected.status} />
                </div>
                {nextStepCopy(selected) ? (
                  <p className="mt-6 rounded-2xl bg-cream/80 px-4 py-3 text-sm text-ink">
                    {nextStepCopy(selected)}
                    {(selected.quotes.length > 0 || selected.options.length > 0) &&
                    !intakeComplete ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => goToTripDetails(selected.id)}
                          className="font-semibold text-gold-deep underline-offset-2 hover:underline"
                        >
                          Add trip details
                        </button>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </section>

              {showIntakeForm ? (
                <section
                  id="trip-details"
                  className="scroll-mt-28 rounded-3xl border-2 border-gold bg-surface p-6 md:p-8"
                >
                  <QuoteIntakeForm
                    key={selected.id}
                    framed={false}
                    defaults={quoteDefaultsFromRequest(selected)}
                    title={intakeComplete ? "Update trip details" : "Trip details"}
                    description={
                      intakeComplete
                        ? "Change anything your agent should know."
                        : "Optional until you choose a quote. Names, address, and birth dates help us book accurately."
                    }
                    submitLabel="Save trip details"
                    saving={savingIntake}
                    onSubmit={saveIntake}
                  />
                  {editingIntake && intakeComplete ? (
                    <button
                      type="button"
                      onClick={() => setEditingIntake(false)}
                      className="mt-4 text-sm font-semibold text-muted"
                    >
                      Cancel
                    </button>
                  ) : null}
                </section>
              ) : null}

              <MessageThread
                messages={selected.messages}
                sender="traveler"
                senderName={selected.traveler.fullName}
                requestId={selected.id}
                onSent={() => refresh()}
              />

              <section className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3 no-print">
                  <div>
                    <h3 className="font-display text-2xl text-ink">Review your options</h3>
                    <p className="mt-1 text-sm text-muted">
                      {selected.quotes.length || selected.options.length ? (
                        "Choose the option you want. Nothing is booked until your agent confirms."
                      ) : (
                        "Your agent is putting options together. We’ll email you when a quote is ready."
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => refresh()}
                    className="text-sm font-semibold text-gold-deep"
                  >
                    Check for updates
                  </button>
                </div>

                {selected.quotes.length === 0 && selected.options.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">
                    No options yet. An agent will follow up, usually within 24 hours.
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
                          className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold disabled:opacity-60"
                        >
                          {chosen
                            ? "Selected"
                            : selecting === quote.id
                              ? "Saving…"
                              : "Choose this option"}
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
                        >
                          Print / save PDF
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

                {selected.options.map((option) => {
                  const chosen = selected.selectedOptionId === option.id;
                  const quote = proposalFromOption(selected, option);
                  return (
                    <div key={option.id} className="space-y-4">
                      <QuoteDocument quote={quote} request={selected} />
                      <div className="flex flex-wrap gap-3 no-print">
                        <button
                          type="button"
                          disabled={chosen || selecting === option.id}
                          onClick={() => selectOption(option.id)}
                          className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold disabled:opacity-60"
                        >
                          {chosen
                            ? "Selected"
                            : selecting === option.id
                              ? "Saving…"
                              : "Choose this option"}
                        </button>
                        {option.flyerUrl ? (
                          <a
                            href={option.flyerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
                          >
                            Open flyer
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </section>

              <details className="rounded-3xl border border-line bg-surface px-6 py-4 md:px-8">
                <summary className="cursor-pointer font-display text-xl text-ink">
                  Request details
                </summary>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <Item
                    label="Trip type"
                    value={tripTypeLabels[selected.trip.tripType] ?? selected.trip.tripType}
                  />
                  <Item label="Travelers" value={formatRequestParty(selected)} />
                  {selected.trip.departureCity ? (
                    <Item label="Departure city" value={selected.trip.departureCity} />
                  ) : null}
                  {selected.trip.budget ? (
                    <Item label="Budget" value={selected.trip.budget} />
                  ) : null}
                  {selected.trip.preferredAgent ? (
                    <Item label="Preferred agent" value={selected.trip.preferredAgent} />
                  ) : null}
                  {selected.paymentStatus !== "not_requested" ||
                  selected.installmentPlanActive ||
                  (selected.paymentPlanType && selected.paymentPlanType !== "none") ? (
                    <Item
                      label="Payment"
                      value={[
                        paymentLabels[selected.paymentStatus] ?? selected.paymentStatus,
                        selected.paymentPlanType && selected.paymentPlanType !== "none"
                          ? paymentPlanTypeLabels[selected.paymentPlanType]
                          : "",
                        scheduleSummary(selected),
                        selected.paymentStatus === "paid" && selected.paidAt
                          ? formatDisplayDate(selected.paidAt)
                          : "",
                        selected.paymentStatus === "refunded" && selected.refundedAt
                          ? formatDisplayDate(selected.refundedAt)
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  ) : null}
                </dl>
                <div className="mt-5">
                  <PaymentPlanPanel request={selected} />
                </div>
                {selected.intake ? <IntakeSummary request={selected} /> : null}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-ink">Notes</h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {(selected.intake?.notes || selected.trip.preferences).trim() ||
                      "No notes yet."}
                  </p>
                </div>
                {intakeComplete && !showIntakeForm ? (
                  <button
                    type="button"
                    onClick={() => goToTripDetails(selected.id)}
                    className="mt-4 text-sm font-semibold text-gold-deep"
                  >
                    Update trip details
                  </button>
                ) : !showIntakeForm ? (
                  <button
                    type="button"
                    onClick={() => goToTripDetails(selected.id)}
                    className="mt-4 text-sm font-semibold text-gold-deep"
                  >
                    Add trip details
                  </button>
                ) : null}
              </details>

              <details className="rounded-3xl border border-line bg-surface px-6 py-4 md:px-8">
                <summary className="cursor-pointer font-display text-xl text-ink">
                  Activity
                </summary>
                <p className="mt-2 text-sm text-muted">
                  Sign-ins and emails for this trip.
                </p>
                <div className="mt-2">
                  <ActivityLog items={activity} embedded />
                </div>
              </details>
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

function IntakeSummary({ request }: { request: TravelRequest }) {
  const intake = request.intake;
  if (!intake) return null;
  const address = formatIntakeAddress(intake);
  return (
    <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
      {address ? <Item label="Address" value={address} /> : null}
      {intake.preferredContactMethods.length > 0 ? (
        <Item label="Preferred contact" value={intake.preferredContactMethods.join(", ")} />
      ) : null}
      {intake.transportationModes.length > 0 ? (
        <Item label="Transportation" value={intake.transportationModes.join(", ")} />
      ) : null}
      {intake.accessibilityNeeded ? (
        <Item
          label="Accessibility"
          value={
            intake.accessibilityNotes
              ? `${intake.accessibilityNeeded} — ${intake.accessibilityNotes}`
              : intake.accessibilityNeeded
          }
        />
      ) : null}
      <Item label="Party" value={formatPartySummary(intake)} />
      {intake.pets || intake.supportAnimal ? (
        <Item
          label="Animals"
          value={[intake.pets ? "Pets" : "", intake.supportAnimal ? "Support animal" : ""]
            .filter(Boolean)
            .join(", ")}
        />
      ) : null}
    </dl>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-muted">Loading dashboard…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
