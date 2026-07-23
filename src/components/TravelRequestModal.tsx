"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { agents, budgetOptions, tripStyleOptions } from "@/lib/agents";
import { createRequest } from "@/lib/requests";

type TravelRequestModalProps = {
  open: boolean;
  onClose: () => void;
};

type SubmitResult = {
  accessCode: string;
  phone: string;
  fullName: string;
};

export function TravelRequestModal({ open, onClose }: TravelRequestModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [tripStyle, setTripStyle] = useState<string[]>([]);

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
      setResult(null);
      setTripStyle([]);
      setSubmitting(false);
    }
  }, [open]);

  function dismiss() {
    onClose();
  }

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
    const payload = {
      fullName: form.get("fullName"),
      email: form.get("email"),
      phone: form.get("phone"),
      destination: form.get("destination"),
      departureCity: form.get("departureCity"),
      travelWindow: form.get("travelWindow"),
      travelers: form.get("travelers"),
      budget: form.get("budget"),
      preferredAgent: form.get("preferredAgent"),
      preferences: form.get("preferences"),
      tripStyle,
    };

    try {
      const request = createRequest({
        fullName: String(payload.fullName ?? ""),
        email: String(payload.email ?? ""),
        phone: String(payload.phone ?? ""),
        destination: String(payload.destination ?? ""),
        departureCity: String(payload.departureCity ?? ""),
        travelWindow: String(payload.travelWindow ?? ""),
        travelers: String(payload.travelers ?? "1"),
        budget: String(payload.budget ?? ""),
        preferredAgent: String(payload.preferredAgent ?? ""),
        preferences: String(payload.preferences ?? ""),
        tripStyle,
      });

      setResult({
        accessCode: request.accessCode,
        phone: request.traveler.phone,
        fullName: request.traveler.fullName,
      });
      localStorage.setItem(
        "amore_last_access",
        JSON.stringify({
          phone: request.traveler.phone,
          accessCode: request.accessCode,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0"
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="travel-request-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[#faf8f4] shadow-2xl sm:rounded-3xl"
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
              Start your travel request
            </h2>
            <p className="mt-1 text-sm text-muted">
              Tell us where you want to go. We&apos;ll research options and share
              them in your trip dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-line px-3 py-1 text-sm text-ink"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 md:px-6">
          {result ? (
            <div className="space-y-4">
              <div className="rounded-3xl bg-cream p-6">
                <h3 className="font-display text-2xl text-ink">
                  You&apos;re in, {result.fullName.split(" ")[0]}!
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Save this access code. Use it with your phone number to open
                  your trip dashboard anytime.
                </p>
                <div className="mt-5 rounded-2xl bg-white px-4 py-5 text-center">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">
                    Access code
                  </div>
                  <div className="mt-2 font-display text-4xl tracking-[0.2em] text-ink">
                    {result.accessCode}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/dashboard?phone=${encodeURIComponent(result.phone)}&code=${result.accessCode}`}
                  className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink"
                  onClick={onClose}
                >
                  Open my dashboard
                </Link>
                <button
                  type="button"
                  onClick={dismiss}
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
                <Field label="Full legal name" name="fullName" placeholder="Exactly as it should appear on travel documents" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" name="email" type="email" />
                  <Field label="Phone" name="phone" type="tel" placeholder="Used to access your dashboard" />
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream"
                >
                  Continue
                </button>
              </div>

              <div className={step === 2 ? "grid gap-4" : "hidden"}>
                <Field label="Where do you want to go?" name="destination" placeholder="Greece, Disney, Jamaica..." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Departure city" name="departureCity" placeholder="Atlanta, Miami..." />
                  <Field label="When do you want to travel?" name="travelWindow" placeholder="Oct 2026 / flexible dates" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Number of travelers" name="travelers" type="number" min="1" defaultValue="2" />
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">Budget range</span>
                    <select
                      name="budget"
                      className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none ring-gold focus:ring-2"
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
                    className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream"
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
                              ? "bg-gold text-ink"
                              : "border border-line bg-white text-muted"
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
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none ring-gold focus:ring-2"
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
                    placeholder="Hotel vs cruise, must-have excursions, accessibility needs, celebration details..."
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none ring-gold focus:ring-2"
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
                    className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
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
        className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none ring-gold focus:ring-2"
      />
    </label>
  );
}

export function useTravelRequestModal(autoOpen = false) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!autoOpen) return;

    const params = new URLSearchParams(window.location.search);
    // Open immediately on home (or when ?start=1 is present).
    const delay = params.get("start") === "1" ? 0 : 400;
    const timer = window.setTimeout(() => setOpen(true), delay);
    return () => window.clearTimeout(timer);
  }, [autoOpen]);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  return {
    open,
    openModal,
    closeModal,
  };
}
