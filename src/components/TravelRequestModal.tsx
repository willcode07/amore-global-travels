"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { assetPath } from "@/lib/asset";
import { PlaceSuggestInput } from "@/components/PlaceSuggestInput";
import { PhoneField } from "@/components/PhoneField";
import { agents, budgetOptions, tripTypeOptions } from "@/lib/agents";
import {
  ADULT_MIN_AGE,
  CHILD_MAX_AGE,
  parseAgeList,
  resizeList,
  validateQuotePartyAges,
} from "@/lib/intake";
import { validateStoredPhone } from "@/lib/phone";
import { createRequest } from "@/lib/requests";
import { readSession } from "@/lib/session";
import { TripType } from "@/lib/types";

type TravelRequestModalProps = {
  open: boolean;
  onClose: () => void;
  prefill?: {
    destination?: string;
    tripType?: TripType;
  };
};

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatTravelWindow(depart: string, returnDate: string) {
  const pretty = (iso: string) => {
    if (!iso) return "";
    const [year, month, day] = iso.split("-").map(Number);
    if (!year || !month || !day) return iso;
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  if (depart && returnDate) return `${pretty(depart)} – ${pretty(returnDate)}`;
  if (depart) return `From ${pretty(depart)}`;
  if (returnDate) return `Until ${pretty(returnDate)}`;
  return "Flexible dates";
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export function TravelRequestModal({
  open,
  onClose,
  prefill,
}: TravelRequestModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resultName, setResultName] = useState("");
  const [resultTripId, setResultTripId] = useState("");
  const [tripType, setTripType] = useState<TripType>("not_sure");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adultsCount, setAdultsCount] = useState("2");
  const [childrenCount, setChildrenCount] = useState("0");
  const [adultAges, setAdultAges] = useState<string[]>(["", ""]);
  const [childAges, setChildAges] = useState<string[]>([]);
  const minDate = useMemo(() => todayIso(), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setError("");
      setResultName("");
      setResultTripId("");
      setSubmitting(false);
      setDepartureDate("");
      setReturnDate("");
      setDepartureCity("");
      setAdultsCount("2");
      setChildrenCount("0");
      setAdultAges(["", ""]);
      setChildAges([]);
      return;
    }

    const session = readSession();
    const names = splitName(session?.fullName ?? "");
    setFirstName(names.first);
    setLastName(names.last);
    setEmail(session?.email ?? "");
    setPhone(session?.phone ?? "");
    setDestination(prefill?.destination ?? "");
    setTripType(prefill?.tripType ?? "not_sure");
  }, [open, prefill?.destination, prefill?.tripType]);

  function validateStep(current: number) {
    if (current === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        return "Enter your first and last name.";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return "Enter a valid email address.";
      }
      return validateStoredPhone(phone) || "";
    }

    if (current === 2) {
      if (!destination.trim()) return "Enter a destination.";
      const adults = Number(adultsCount);
      const children = Number(childrenCount);
      const partyErrors = validateQuotePartyAges({
        adultsCount: adults,
        childrenCount: children,
        adultAges,
        childAges,
      });
      return partyErrors[0] ?? "";
    }

    return "";
  }

  function goNext() {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, 3));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 3) {
      goNext();
      return;
    }

    const contactError = validateStep(1);
    const tripError = validateStep(2);
    if (contactError || tripError) {
      setError(contactError || tripError);
      setStep(contactError ? 1 : 2);
      return;
    }

    setSubmitting(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const adults = Number(adultsCount);
    const children = Number(childrenCount);

    try {
      const request = await createRequest({
        fullName,
        email,
        phone,
        destination,
        departureCity,
        travelWindow: formatTravelWindow(departureDate, returnDate),
        nickname: destination.trim(),
        dateMode: departureDate || returnDate ? "fixed" : "flexible",
        travelers: adults + children,
        adultsCount: adults,
        childrenCount: children,
        adultAges: parseAgeList(adultAges),
        childAges: parseAgeList(childAges),
        budget: String(form.get("budget") ?? ""),
        preferredAgent: String(form.get("preferredAgent") ?? ""),
        preferences: String(form.get("preferences") ?? ""),
        tripType,
      });
      setResultName(request.traveler.fullName);
      setResultTripId(request.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="travel-request-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
              Start here
            </p>
            <h2
              id="travel-request-title"
              className="font-display text-2xl text-ink md:text-3xl"
            >
              Request a quote
            </h2>
            <p className="mt-1 text-sm text-muted">
              An agent will research options and send a written quote to your trip
              dashboard. Nothing books until you say so.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-3 py-1 text-sm text-ink"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 md:px-6">
          {resultName ? (
            <div className="space-y-4">
              <div className="rounded-3xl bg-cream p-6">
                <h3 className="font-display text-2xl text-ink">
                  You&apos;re in, {resultName.split(" ")[0]}!
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Your quote request has been received. An agent will follow up,
                  usually within 24 hours, with options in this dashboard.
                </p>
                <p className="mt-3 text-sm text-muted">
                  You don&apos;t need to do anything else right now. Extra details
                  like address and birth dates can wait until you choose an option.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold"
                  onClick={() => {
                    const href = assetPath(
                      resultTripId
                        ? `/dashboard/?trip=${encodeURIComponent(resultTripId)}`
                        : "/dashboard/",
                    );
                    onClose();
                    window.location.assign(href);
                  }}
                >
                  Open my dashboard
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink"
                >
                  Browse the site
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                <span className={step === 1 ? "text-gold-deep" : ""}>1. You</span>
                <span>·</span>
                <span className={step === 2 ? "text-gold-deep" : ""}>2. Trip</span>
                <span>·</span>
                <span className={step === 3 ? "text-gold-deep" : ""}>3. Details</span>
              </div>

              <div className={step === 1 ? "grid gap-4" : "hidden"}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">First name</span>
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      autoComplete="given-name"
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">Last name</span>
                    <input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      autoComplete="family-name"
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">Email *</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                  <PhoneField
                    label="Phone"
                    value={phone}
                    onChange={setPhone}
                    required
                    hint="Country code plus number — used with email to open your dashboard."
                  />
                </div>
                {error && step === 1 ? <p className="text-sm text-red-700">{error}</p> : null}
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold"
                >
                  Continue
                </button>
              </div>

              <div className={step === 2 ? "grid gap-4" : "hidden"}>
                <div>
                  <PlaceSuggestInput
                    kind="destination"
                    label="Where do you want to go?"
                    value={destination}
                    onChange={setDestination}
                    placeholder="Jamaica, Cancun, Accra, London..."
                  />
                  <p className="mt-1 text-xs text-muted">
                    Country or city abroad. Type it if it is not suggested.
                  </p>
                </div>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-ink">What kind of trip?</span>
                  <select
                    value={tripType}
                    onChange={(event) => setTripType(event.target.value as TripType)}
                    className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                  >
                    {tripTypeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <PlaceSuggestInput
                      kind="city"
                      name="departureCity"
                      label="Departure city"
                      value={departureCity}
                      onChange={setDepartureCity}
                      placeholder="Atlanta, Miami..."
                    />
                    <p className="mt-1 text-xs text-muted">
                      US city you leave from. Type any city if it is not listed.
                    </p>
                    {departureCity.trim() && destination.trim() ? (
                      <p className="mt-1 text-sm font-medium text-ink">
                        Leaving {departureCity.trim()} for {destination.trim()}.
                      </p>
                    ) : null}
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">Budget range</span>
                    <select
                      name="budget"
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                      defaultValue={budgetOptions[1]}
                    >
                      {budgetOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">Adults *</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={adultsCount}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAdultsCount(value);
                        const count = Number(value);
                        if (Number.isInteger(count) && count >= 1 && count <= 12) {
                          setAdultAges((current) => resizeList(current, count, ""));
                        }
                      }}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">
                      Children (17 and under)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={childrenCount}
                      onChange={(event) => {
                        const value = event.target.value;
                        setChildrenCount(value);
                        const count = Number(value);
                        if (Number.isInteger(count) && count >= 0 && count <= 12) {
                          setChildAges((current) => resizeList(current, count, ""));
                        }
                      }}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                </div>
                <p className="text-xs text-muted">
                  Ages as of the travel date help us quote kids, seniors, and
                  adults-only resorts. Children are 17 and under.
                </p>
                {adultAges.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {adultAges.map((age, index) => (
                      <label key={`adult-age-${index}`} className="block text-sm">
                        <span className="mb-1.5 block font-medium text-ink">
                          Adult {index + 1} age *
                        </span>
                        <input
                          type="number"
                          min={ADULT_MIN_AGE}
                          max={120}
                          value={age}
                          onChange={(event) => {
                            const next = event.target.value;
                            setAdultAges((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? next : item,
                              ),
                            );
                          }}
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
                {childAges.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {childAges.map((age, index) => (
                      <label key={`child-age-${index}`} className="block text-sm">
                        <span className="mb-1.5 block font-medium text-ink">
                          Child {index + 1} age *
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={CHILD_MAX_AGE}
                          value={age}
                          onChange={(event) => {
                            const next = event.target.value;
                            setChildAges((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? next : item,
                              ),
                            );
                          }}
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">
                      Departure date
                    </span>
                    <input
                      type="date"
                      value={departureDate}
                      min={minDate}
                      onChange={(event) => {
                        const next = event.target.value;
                        setDepartureDate(next);
                        if (returnDate && next && returnDate < next) {
                          setReturnDate("");
                        }
                      }}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">
                      Return date
                    </span>
                    <input
                      type="date"
                      value={returnDate}
                      min={departureDate || minDate}
                      onChange={(event) => setReturnDate(event.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                </div>
                <p className="text-xs text-muted">
                  Leave dates blank if the window is still flexible.
                </p>
                {error && step === 2 ? <p className="text-sm text-red-700">{error}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold"
                  >
                    Continue
                  </button>
                </div>
              </div>

              <div className={step === 3 ? "grid gap-4" : "hidden"}>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-ink">
                    Preferred agent (optional)
                  </span>
                  <select
                    name="preferredAgent"
                    className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                    defaultValue=""
                  >
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.name}>
                        {agent.name || "—"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-ink">
                    Notes to the Agent
                  </span>
                  <textarea
                    name="preferences"
                    rows={4}
                    placeholder="Celebration details, must-have excursions, accessibility needs..."
                    className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                  />
                </label>

                {error && <p className="text-sm text-red-700">{error}</p>}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink"
                  >
                    Back
                  </button>
                  {step === 3 ? (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold disabled:opacity-60"
                    >
                      {submitting ? "Submitting..." : "Submit travel request"}
                    </button>
                  ) : null}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
