"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { agents, budgetOptions, tripStyleOptions, tripTypeOptions } from "@/lib/agents";
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

export function TravelRequestModal({
  open,
  onClose,
  prefill,
}: TravelRequestModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resultName, setResultName] = useState("");
  const [tripStyle, setTripStyle] = useState<string[]>([]);
  const [tripType, setTripType] = useState<TripType>("not_sure");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState("");

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
      setTripStyle([]);
      setSubmitting(false);
      return;
    }

    const session = readSession();
    setFullName(session?.fullName ?? "");
    setEmail(session?.email ?? "");
    setPhone(session?.phone ?? "");
    setDestination(prefill?.destination ?? "");
    setTripType(prefill?.tripType ?? "not_sure");
  }, [open, prefill?.destination, prefill?.tripType]);

  function toggleStyle(style: string) {
    setTripStyle((current) =>
      current.includes(style)
        ? current.filter((item) => item !== style)
        : [...current, style],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const request = await createRequest({
        fullName,
        email,
        phone,
        destination,
        departureCity: String(form.get("departureCity") ?? ""),
        travelWindow: String(form.get("travelWindow") ?? ""),
        travelers: String(form.get("travelers") ?? "1"),
        budget: String(form.get("budget") ?? ""),
        preferredAgent: String(form.get("preferredAgent") ?? ""),
        preferences: String(form.get("preferences") ?? ""),
        tripStyle,
        tripType,
      });
      setResultName(request.traveler.fullName);
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
                  Your dashboard is tied to this email and phone number. Come back
                  anytime to see every quote in one place — no access codes to remember.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-brand"
                  onClick={() => {
                    onClose();
                    router.push("/dashboard");
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
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-ink">Full legal name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Exactly as it should appear on travel documents"
                    className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">Phone</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Used with email to open your dashboard"
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-brand"
                >
                  Continue
                </button>
              </div>

              <div className={step === 2 ? "grid gap-4" : "hidden"}>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">What kind of trip?</p>
                  <div className="flex flex-wrap gap-2">
                    {tripTypeOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setTripType(option.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          tripType === option.id
                            ? "bg-gold text-brand"
                            : "border border-line bg-surface text-muted"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-ink">
                    Where do you want to go?
                  </span>
                  <input
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder="Jamaica, Ghana, a cruise from Miami..."
                    className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Departure city"
                    name="departureCity"
                    placeholder="Atlanta, Miami..."
                  />
                  <Field
                    label="When do you want to travel?"
                    name="travelWindow"
                    placeholder="Oct 2026 / flexible dates"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Number of travelers"
                    name="travelers"
                    type="number"
                    min="1"
                    defaultValue="2"
                  />
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
                    onClick={() => setStep(3)}
                    className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-brand"
                  >
                    Continue
                  </button>
                </div>
              </div>

              <div className={step === 3 ? "grid gap-4" : "hidden"}>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Trip style preferences</p>
                  <div className="flex flex-wrap gap-2">
                    {tripStyleOptions.map((style) => {
                      const active = tripStyle.includes(style);
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => toggleStyle(style)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? "bg-gold text-brand"
                              : "border border-line bg-surface text-muted"
                          }`}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                </div>

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
                    Preferences & notes
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
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-brand disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit travel request"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  min,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  min?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        min={min}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
      />
    </label>
  );
}
