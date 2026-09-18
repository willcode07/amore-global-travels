"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  formatTimestamp,
  formatTripWindow,
  isIntakeComplete,
  namedTravelers,
  QuoteIntakeFields,
  quoteDefaultsFromRequest,
  toTripIntake,
  tripNickname,
} from "@/lib/intake";
import { travelerFacingStatus, tripStatusSteps } from "@/lib/journey";
import { logDashboardLogin, notificationsForTraveler } from "@/lib/notifications";
import { lookupTraveler, updateRequest, addMessage } from "@/lib/requests";
import { clearSession, emailsMatch, phonesMatch, readSession, SESSION_CHANGED_EVENT, writeSession } from "@/lib/session";
import { REQUESTS_CHANGED_EVENT } from "@/lib/store";
import { site } from "@/lib/site";
import { logoutApiSession, postJson } from "@/lib/uploads";
import { DemoNotification, TravelRequest, TripType } from "@/lib/types";

function nextStepCopy(trip: TravelRequest) {
  const status = travelerFacingStatus(trip);
  if (status === "booking_confirmed") {
    return tripStatusSteps[2].text;
  }
  if (trip.selectedQuoteId || trip.selectedOptionId) {
    return isIntakeComplete(trip)
      ? "You chose an option. Your agent will confirm the trip."
      : "You chose an option. Add legal names, dates of birth, and a mailing address so we can book.";
  }
  if (status === "options_ready" || trip.quotes.length > 0 || trip.options.length > 0) {
    return trip.quotes.length > 0 || trip.options.length > 0
      ? "Your quote is ready to review. Choose an option to move forward — address and dates of birth come after that."
      : tripStatusSteps[1].text;
  }
  return "Your agent has this request and will follow up, usually within 24 hours.";
}

function persistTripInUrl(tripId: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (tripId) url.searchParams.set("trip", tripId);
  else url.searchParams.delete("trip");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function TravelerCards({ request }: { request: TravelRequest }) {
  const people = namedTravelers(request);
  if (!people.length) return null;
  return (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
      {people.map((person) => (
        <li
          key={person.key}
          className="rounded-2xl border border-line bg-cream/70 px-4 py-3 text-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-deep">
            {person.label}
          </p>
          <p className="mt-1 font-medium text-ink">{person.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {[
              person.role === "child" ? "17 and under" : "Adult",
              person.age != null ? `age ${person.age}` : "",
              person.dob ? formatDisplayDate(person.dob) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  );
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
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const selectedIdRef = useRef<string | null>(null);
  const emailRef = useRef(email);
  const phoneRef = useRef(phone);
  const signedInRef = useRef(false);
  selectedIdRef.current = selectedId;
  emailRef.current = email;
  phoneRef.current = phone;

  const selected = useMemo(
    () => trips.find((trip) => trip.id === selectedId) ?? null,
    [trips, selectedId],
  );
  signedInRef.current = trips.length > 0;

  const activity = useMemo(
    () => (selected ? buildTripActivity(selected, notes) : []),
    [selected, notes],
  );

  const intakeComplete = selected ? isIntakeComplete(selected) : false;
  const quoteChosen = Boolean(selected?.selectedQuoteId || selected?.selectedOptionId);
  const intakeStage = quoteChosen ? "booking" : "quote";
  const showIntakeForm = Boolean(selected && editingIntake);
  const selectedStatus = selected ? travelerFacingStatus(selected) : null;

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
      persistTripInUrl(tripId);
    }
    setEditingIntake(true);
    setPendingDetailsScroll(true);
  }

  const lookup = useCallback(async (
    nextEmail = emailRef.current,
    nextPhone = phoneRef.current,
    options: {
      tripId?: string | null;
      logLogin?: boolean;
      keepSelection?: boolean;
      silent?: boolean;
    } = {},
  ) => {
    if (!options.silent) {
      setLoading(true);
      setError("");
    }
    try {
      const found = await lookupTraveler(nextEmail, nextPhone);
      const preferredId =
        options.tripId ||
        (options.keepSelection === false ? undefined : selectedIdRef.current);
      const kept = preferredId
        ? found.find((trip) => trip.id === preferredId)
        : undefined;
      const nextSelectedId = kept?.id ?? found[0]?.id ?? null;
      setTrips(found);
      setEmail(nextEmail);
      setPhone(nextPhone);
      writeSession({
        fullName: kept?.traveler.fullName ?? found[0]?.traveler.fullName ?? "",
        email: nextEmail,
        phone: nextPhone,
      });
      if (options.logLogin) logDashboardLogin(nextEmail);
      setNotes(notificationsForTraveler(nextEmail));
      setSelectedId(nextSelectedId);
      persistTripInUrl(nextSelectedId);
      setLastCheckedAt(new Date().toISOString());
      return found;
    } catch (err) {
      if (!options.silent) {
        setTrips([]);
        setSelectedId(null);
        setError(err instanceof Error ? err.message : "Unable to find quotes.");
      }
      return [];
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (tripId?: string | null, silent = false) => {
    if (!emailRef.current || !phoneRef.current) return;
    if (!silent) setRefreshing(true);
    try {
      await lookup(emailRef.current, phoneRef.current, {
        tripId: tripId ?? selectedIdRef.current,
        keepSelection: true,
        silent,
      });
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [lookup]);

  useEffect(() => {
    const saved = readSession();
    const emailParam = searchParams.get("email") ?? "";
    const phoneParam = searchParams.get("phone") ?? "";
    const tripParam = searchParams.get("trip");

    async function boot() {
      if (isApiBackend()) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/me`, {
            credentials: "include",
          });
          if (res.ok) {
            const me = (await res.json()) as { role?: string; email?: string; phone?: string };
            if (me.role === "traveler" && me.email && me.phone) {
              await lookup(me.email, me.phone, {
                tripId: tripParam,
                logLogin: true,
              });
              setReady(true);
              return;
            }
          }
        } catch {
          /* stay on login */
        }
        if (emailParam) setEmail(emailParam);
        if (phoneParam) setPhone(phoneParam);
        setReady(true);
        return;
      }
      const nextEmail = emailParam || saved?.email || "";
      const nextPhone = phoneParam || saved?.phone || "";
      if (emailParam || phoneParam) {
        setEmail(nextEmail);
        setPhone(nextPhone);
      } else if (!saved) {
        setEmail("");
        setPhone("");
      } else {
        setEmail(saved.email);
        setPhone(saved.phone);
      }
      if (nextEmail && nextPhone) {
        await lookup(nextEmail, nextPhone, {
          tripId: tripParam,
          logLogin: true,
        });
      }
      setReady(true);
    }

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const tripParam = searchParams.get("trip");
    const emailParam = searchParams.get("email");
    const phoneParam = searchParams.get("phone");
    if (emailParam && phoneParam) {
      if (
        !emailsMatch(emailParam, emailRef.current) ||
        !phonesMatch(phoneParam, phoneRef.current)
      ) {
        void lookup(emailParam, phoneParam, {
          tripId: tripParam,
          keepSelection: false,
          silent: true,
        });
        return;
      }
    }
    if (tripParam && tripParam !== selectedIdRef.current && signedInRef.current) {
      void refresh(tripParam, true);
    }
  }, [ready, searchParams, lookup, refresh]);

  useEffect(() => {
    function sessionMatchesSignedIn() {
      const session = readSession();
      if (!session) return signedInRef.current === false;
      return (
        emailsMatch(session.email, emailRef.current) &&
        phonesMatch(session.phone, phoneRef.current)
      );
    }

    async function syncFromOutside() {
      const session = readSession();
      if (session) {
        if (!sessionMatchesSignedIn() || !signedInRef.current) {
          await lookup(session.email, session.phone, {
            tripId: selectedIdRef.current,
            keepSelection: true,
          });
          return;
        }
        if (signedInRef.current) {
          await refresh(undefined, true);
        }
        return;
      }
      if (signedInRef.current) {
        setTrips([]);
        setSelectedId(null);
        setEmail("");
        setPhone("");
        setOtpSent(false);
        setOtpCode("");
      }
    }

    function onStorage(event: StorageEvent) {
      if (
        event.key === "amore_travel_requests" ||
        event.key === "amore_traveler_session" ||
        event.key === null
      ) {
        void syncFromOutside();
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void syncFromOutside();
    }

    function onRequestsChanged() {
      void refresh(undefined, true);
    }

    function onSessionChanged() {
      void syncFromOutside();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(REQUESTS_CHANGED_EVENT, onRequestsChanged);
    window.addEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible" && signedInRef.current) {
        void refresh(undefined, true);
      }
    }, 8000);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(REQUESTS_CHANGED_EVENT, onRequestsChanged);
      window.removeEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
      window.clearInterval(poll);
    };
  }, [lookup, refresh]);

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
        await lookup(email, phone, { logLogin: true, keepSelection: false });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to sign in.");
      } finally {
        setLoading(false);
      }
      return;
    }
    void lookup(email, phone, { logLogin: true, keepSelection: false });
  }

  async function selectQuote(quoteId: string) {
    if (!selected) return;
    setSelecting(quoteId);
    try {
      await updateRequest(selected.id, { selectedQuoteId: quoteId });
      await refresh(selected.id);
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
      await refresh(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to select option.");
    } finally {
      setSelecting(null);
    }
  }

  async function saveIntake(data: QuoteIntakeFields, tripType: TripType) {
    if (!selected) return;
    const wasComplete = isIntakeComplete(selected);
    setSavingIntake(true);
    setError("");
    try {
      const updated = await updateRequest(selected.id, {
        intake: toTripIntake(data, tripType),
      });
      if (!wasComplete && isIntakeComplete(updated)) {
        await addMessage(selected.id, {
          sender: "traveler",
          senderName: updated.traveler.fullName,
          body: "Hi! My booking details are in. Let me know if you need anything else before you confirm the trip.",
        });
      }
      setEditingIntake(false);
      await refresh(selected.id);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Unable to save trip details.");
    } finally {
      setSavingIntake(false);
    }
  }

  async function signOut() {
    clearSession();
    if (isApiBackend()) await logoutApiSession();
    setTrips([]);
    setSelectedId(null);
    setEmail("");
    setPhone("");
    setError("");
    setOtpSent(false);
    setOtpCode("");
    setLastCheckedAt(null);
    persistTripInUrl(null);
  }

  const firstName = trips[0]?.traveler.fullName.split(" ")[0] ?? "";
  const lastCheckedLabel = lastCheckedAt
    ? `Last checked ${formatTimestamp(lastCheckedAt)}`
    : "Not checked yet";

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
              onClick={() => void signOut()}
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
          autoComplete="off"
          className="max-w-md space-y-4 rounded-3xl border border-line bg-surface p-6 md:p-8"
        >
          <h2 className="font-display text-2xl text-ink">Sign in</h2>
          <p className="text-sm text-muted">
            Use the email and phone from the quote request you want to open.
            Fields start blank after sign-out so a guest pass cannot reopen the
            previous traveler.
          </p>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
              className="w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
              required
            />
          </label>
          <PhoneField
            label="Phone number"
            value={phone}
            onChange={setPhone}
            required
            autoComplete="off"
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
                const people = namedTravelers(trip);
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
                        persistTripInUrl(trip.id);
                        setEditingIntake(false);
                      }}
                      className="w-full text-left"
                    >
                      <div className="font-display text-xl text-ink">{tripNickname(trip)}</div>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold-deep">
                        {trip.tripRef}
                      </p>
                      <p className="mt-2 text-sm text-muted">{formatTripWindow(trip.trip)}</p>
                      <p className="mt-1 text-xs text-muted">
                        Requested {formatTimestamp(trip.createdAt)}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {people.map((person) => person.name).join(" · ")}
                      </p>
                      <div className="mt-4">
                        <StatusBadge status={travelerFacingStatus(trip)} />
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          {selected && selectedStatus && (
            <div className="space-y-6">
              <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-3xl text-ink">
                      {tripNickname(selected)}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {selected.tripRef} · Requested {formatTimestamp(selected.createdAt)}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {selected.trip.destination} · {formatTripWindow(selected.trip)}
                    </p>
                  </div>
                  <StatusBadge status={selectedStatus} />
                </div>
                <TravelerCards request={selected} />
                <div className="mt-8">
                  <StatusTracker status={selectedStatus} />
                </div>
                {nextStepCopy(selected) ? (
                  <p className="mt-6 rounded-2xl bg-cream/80 px-4 py-3 text-sm text-ink">
                    {nextStepCopy(selected)}
                    {quoteChosen && !intakeComplete ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => goToTripDetails(selected.id)}
                          className="font-semibold text-gold-deep underline-offset-2 hover:underline"
                        >
                          Add booking details
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
                    key={`${selected.id}-${intakeStage}`}
                    framed={false}
                    stage={intakeStage}
                    defaults={quoteDefaultsFromRequest(selected)}
                    title={quoteChosen ? "Booking details" : "Quote preferences"}
                    description={
                      quoteChosen
                        ? "We need legal names, dates of birth, and a mailing address to book. Trip preferences can still be updated."
                        : "Optional extras for this quote. Address, dates of birth, and how you’ll travel are collected after you choose an option."
                    }
                    submitLabel="Save trip details"
                    saving={savingIntake}
                    onSubmit={saveIntake}
                  />
                  {editingIntake ? (
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
                onSent={() => void refresh(selected.id)}
              />

              <section className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3 no-print">
                  <div>
                    <h3 className="font-display text-2xl text-ink">Review your options</h3>
                    <p className="mt-1 text-sm text-muted">
                      {selected.quotes.length || selected.options.length ? (
                        "Choose the option you want. Nothing is booked until your agent confirms."
                      ) : (
                        "Your agent is putting options together. This list refreshes from the latest saved trip — you should not need a full reload."
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted">{lastCheckedLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refresh(selected.id)}
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink"
                  >
                    {refreshing || loading ? "Refreshing…" : "Refresh status"}
                  </button>
                </div>

                {selected.quotes.length === 0 && selected.options.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">
                    <p>No options yet. An agent will follow up, usually within 24 hours.</p>
                    <p className="mt-2 text-xs">{lastCheckedLabel}</p>
                    <p className="mt-3">
                      Need a faster reply? Email{" "}
                      <a className="font-semibold text-gold-deep underline" href={`mailto:${site.email}`}>
                        {site.email}
                      </a>{" "}
                      or call{" "}
                      <a className="font-semibold text-gold-deep underline" href={site.phoneHref}>
                        {site.phone}
                      </a>
                      .
                    </p>
                    <p className="mt-3 text-xs">
                      Ask your agent to escalate if you have not heard back after one business day.
                    </p>
                  </div>
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
                  <Item label="Request ID" value={selected.tripRef} />
                  <Item label="Created" value={formatTimestamp(selected.createdAt)} />
                  <Item
                    label="Trip type"
                    value={tripTypeLabels[selected.trip.tripType] ?? selected.trip.tripType}
                  />
                  <Item label="Dates" value={formatTripWindow(selected.trip)} />
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
                <TravelerCards request={selected} />
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
                {!showIntakeForm ? (
                  <button
                    type="button"
                    onClick={() => goToTripDetails(selected.id)}
                    className="mt-4 text-sm font-semibold text-gold-deep"
                  >
                    {quoteChosen
                      ? intakeComplete
                        ? "Update booking details"
                        : "Add booking details"
                      : "Add quote preferences"}
                  </button>
                ) : null}
              </details>

              <details className="rounded-3xl border border-line bg-surface px-6 py-4 md:px-8" open={selected.quotes.length === 0 && selected.options.length === 0}>
                <summary className="cursor-pointer font-display text-xl text-ink">
                  Activity
                </summary>
                <p className="mt-2 text-sm text-muted">
                  Sign-ins, messages, and emails for this trip. {lastCheckedLabel}.
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
