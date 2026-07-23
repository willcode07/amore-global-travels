"use client";

import { FormEvent, useState } from "react";
import {
  agents,
  contactMethodOptions,
  transportationOptions,
} from "@/lib/agents";
import {
  contactMailtoBody,
  downloadContactPdf,
  downloadQuotePdf,
  openMailtoWithBody,
  quoteMailtoBody,
  type ContactFormData,
  type QuoteFormData,
} from "@/lib/pdf";
import { createRequest } from "@/lib/requests";
import { site } from "@/lib/site";
import { usStates } from "@/lib/us-states";

type ClientIntakeFormsProps = {
  /** When true, quote submissions also create a local travel request. */
  createInboxRequest?: boolean;
  onQuoteCreated?: () => void;
  showQuoteLinkInContact?: boolean;
  onOpenQuote?: () => void;
};

function toggleValue(
  value: string,
  current: string[],
  setter: (next: string[]) => void,
) {
  setter(
    current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value],
  );
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-gold text-ink" : "border border-line bg-white text-muted"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  min?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={min}
        className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none ring-gold focus:ring-2"
      />
    </label>
  );
}

export function ClientIntakeForms({
  createInboxRequest = false,
  onQuoteCreated,
  showQuoteLinkInContact = true,
  onOpenQuote,
}: ClientIntakeFormsProps) {
  const [contactMethods, setContactMethods] = useState<string[]>([]);
  const [transportModes, setTransportModes] = useState<string[]>([]);
  const [accessibilityNeeded, setAccessibilityNeeded] = useState("");
  const [pets, setPets] = useState(false);
  const [supportAnimal, setSupportAnimal] = useState(false);
  const [contactStatus, setContactStatus] = useState("");
  const [quoteStatus, setQuoteStatus] = useState("");
  const [contactError, setContactError] = useState("");
  const [quoteError, setQuoteError] = useState("");

  function handleContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactError("");
    const form = new FormData(event.currentTarget);
    const data: ContactFormData = {
      firstName: String(form.get("contactFirstName") ?? "").trim(),
      lastName: String(form.get("contactLastName") ?? "").trim(),
      phone: String(form.get("contactPhone") ?? "").trim(),
      email: String(form.get("contactEmail") ?? "").trim(),
      message: String(form.get("contactMessage") ?? "").trim(),
    };

    try {
      const filename = downloadContactPdf(data);
      openMailtoWithBody(
        `Contact Us: ${data.firstName || "Inquiry"} ${data.lastName}`.trim(),
        contactMailtoBody(data),
      );
      setContactStatus(
        `PDF downloaded (${filename}). Email client opened for ${site.email}.`,
      );
      event.currentTarget.reset();
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "Unable to submit.");
    }
  }

  function handleQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuoteError("");
    const form = new FormData(event.currentTarget);
    const data: QuoteFormData = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      address1: String(form.get("address1") ?? "").trim(),
      address2: String(form.get("address2") ?? "").trim(),
      city: String(form.get("city") ?? "").trim(),
      state: String(form.get("state") ?? "").trim(),
      zip: String(form.get("zip") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      preferredContactMethods: contactMethods,
      destination: String(form.get("destination") ?? "").trim(),
      transportationModes: transportModes,
      departureDate: String(form.get("departureDate") ?? "").trim(),
      returnDate: String(form.get("returnDate") ?? "").trim(),
      preferences: String(form.get("preferences") ?? "").trim(),
      accessibilityNeeded,
      accessibilityNotes: String(form.get("accessibilityNotes") ?? "").trim(),
      adultsCount: String(form.get("adultsCount") ?? "").trim(),
      adultsAges: String(form.get("adultsAges") ?? "").trim(),
      childrenCount: String(form.get("childrenCount") ?? "").trim(),
      childrenAges: String(form.get("childrenAges") ?? "").trim(),
      pets,
      supportAnimal,
      preferredAgent: String(form.get("preferredAgent") ?? "").trim(),
    };

    try {
      const filename = downloadQuotePdf(data);
      openMailtoWithBody(
        `Request a Quote: ${data.firstName || "Traveler"} ${data.lastName}`.trim(),
        quoteMailtoBody(data),
      );

      if (createInboxRequest) {
        const fullName =
          [data.firstName, data.lastName].filter(Boolean).join(" ") ||
          "Demo Traveler";
        const travelWindow =
          data.departureDate && data.returnDate
            ? `${data.departureDate} – ${data.returnDate}`
            : data.departureDate || data.returnDate || "Flexible dates";
        const travelers =
          (Number(data.adultsCount) || 0) + (Number(data.childrenCount) || 0) ||
          1;

        createRequest({
          fullName,
          email: data.email,
          phone: data.phone,
          destination: data.destination,
          departureCity: data.city,
          travelWindow,
          travelers,
          preferredAgent: data.preferredAgent,
          preferences: [
            data.preferences,
            data.preferredContactMethods.length
              ? `Contact: ${data.preferredContactMethods.join(", ")}`
              : "",
            data.transportationModes.length
              ? `Transport: ${data.transportationModes.join(", ")}`
              : "",
            data.accessibilityNeeded
              ? `Accessibility: ${data.accessibilityNeeded}${data.accessibilityNotes ? ` — ${data.accessibilityNotes}` : ""}`
              : "",
            `Adults: ${data.adultsCount || "0"} (ages ${data.adultsAges || "n/a"})`,
            `Children: ${data.childrenCount || "0"} (ages ${data.childrenAges || "n/a"})`,
            data.pets ? "Pets: Yes" : "",
            data.supportAnimal ? "Support animal: Yes" : "",
            [data.address1, data.address2, data.city, data.state, data.zip]
              .filter(Boolean)
              .join(", "),
          ]
            .filter(Boolean)
            .join("\n"),
        });
        onQuoteCreated?.();
      }

      setQuoteStatus(
        `PDF downloaded (${filename}). Email client opened for ${site.email}.`,
      );
      setContactMethods([]);
      setTransportModes([]);
      setAccessibilityNeeded("");
      setPets(false);
      setSupportAnimal(false);
      event.currentTarget.reset();
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Unable to submit.");
    }
  }

  return (
    <div className="space-y-10">
      <form
        id="contact-us-form"
        onSubmit={handleContact}
        className="grid gap-4 rounded-3xl border border-line bg-surface p-6 md:p-8"
      >
        <div>
          <h2 className="font-display text-2xl text-ink">Contact Us</h2>
          <p className="mt-1 text-sm text-muted">
            Submissions generate a PDF routed to {site.email}.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="contactFirstName" />
          <Field label="Last name" name="contactLastName" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number" name="contactPhone" type="tel" />
          <Field label="Email address" name="contactEmail" type="email" />
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">
            General questions
          </span>
          <textarea
            name="contactMessage"
            rows={4}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none ring-gold focus:ring-2"
          />
        </label>
        {contactError && <p className="text-sm text-red-700">{contactError}</p>}
        {contactStatus && <p className="text-sm text-gold-deep">{contactStatus}</p>}
        <button
          type="submit"
          className="w-fit rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink"
        >
          Send Contact Us PDF
        </button>
        {showQuoteLinkInContact && (
          <p className="border-t border-line pt-4 text-sm text-muted">
            Ready to plan a trip?{" "}
            {onOpenQuote ? (
              <button
                type="button"
                onClick={onOpenQuote}
                className="font-semibold text-gold-deep underline underline-offset-2"
              >
                Request a Quote
              </button>
            ) : (
              <a
                href="#request-a-quote-form"
                className="font-semibold text-gold-deep underline underline-offset-2"
              >
                Request a Quote
              </a>
            )}
          </p>
        )}
      </form>

      <form
        id="request-a-quote-form"
        onSubmit={handleQuote}
        className="grid gap-4 rounded-3xl border border-line bg-surface p-6 md:p-8"
      >
        <div>
          <h2 className="font-display text-2xl text-ink">Request a Quote</h2>
          <p className="mt-1 text-sm text-muted">
            Full questionnaire. PDF routes to {site.email}
            {createInboxRequest ? " and creates an inbox request." : "."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" />
          <Field label="Last name" name="lastName" />
        </div>
        <Field label="Address 1 (USPS)" name="address1" />
        <Field label="Address 2" name="address2" placeholder="Apt, suite, unit" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" name="city" />
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">State</span>
            <select
              name="state"
              defaultValue=""
              className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none ring-gold focus:ring-2"
            >
              <option value="">Select</option>
              {usStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
          <Field label="ZIP code (USPS)" name="zip" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number" name="phone" type="tel" />
          <Field label="Email address" name="email" type="email" />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">
            Preferred contact method (all that apply)
          </legend>
          <div className="flex flex-wrap gap-2">
            {contactMethodOptions.map((method) => (
              <Chip
                key={method}
                label={method}
                active={contactMethods.includes(method)}
                onClick={() =>
                  toggleValue(method, contactMethods, setContactMethods)
                }
              />
            ))}
          </div>
        </fieldset>

        <Field label="Desired destination" name="destination" />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">
            Mode of transportation (all that apply)
          </legend>
          <div className="flex flex-wrap gap-2">
            {transportationOptions.map((mode) => (
              <Chip
                key={mode}
                label={mode}
                active={transportModes.includes(mode)}
                onClick={() =>
                  toggleValue(mode, transportModes, setTransportModes)
                }
              />
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Departure date" name="departureDate" type="date" />
          <Field label="Return date" name="returnDate" type="date" />
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">
            Travel preferences
          </span>
          <textarea
            name="preferences"
            rows={3}
            placeholder="Eg. Cruise Port, Balcony, Ocean View, Airport Location, Travel Times, etc."
            className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none ring-gold focus:ring-2"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">
            Disability accessibility needed?
          </legend>
          <div className="flex flex-wrap gap-2">
            {["Yes", "No"].map((value) => (
              <Chip
                key={value}
                label={value}
                active={accessibilityNeeded === value}
                onClick={() => setAccessibilityNeeded(value)}
              />
            ))}
          </div>
        </fieldset>
        {accessibilityNeeded === "Yes" && (
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">
              Brief explanation (optional)
            </span>
            <textarea
              name="accessibilityNotes"
              rows={2}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none ring-gold focus:ring-2"
            />
          </label>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-ink">
            Traveling party count &amp; ages
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Adults" name="adultsCount" type="number" defaultValue="2" />
            <Field label="Adult ages" name="adultsAges" placeholder="e.g. 42, 38" />
            <Field
              label="Children (under 18)"
              name="childrenCount"
              type="number"
              defaultValue="0"
            />
            <Field
              label="Children ages"
              name="childrenAges"
              placeholder="e.g. 12, 8"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip label="Pets" active={pets} onClick={() => setPets((v) => !v)} />
            <Chip
              label="Support animal"
              active={supportAnimal}
              onClick={() => setSupportAnimal((v) => !v)}
            />
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">
            Select your travel agent
          </span>
          <select
            name="preferredAgent"
            defaultValue=""
            className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none ring-gold focus:ring-2"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.name}>
                {agent.name || "—"}
              </option>
            ))}
          </select>
        </label>

        {quoteError && <p className="text-sm text-red-700">{quoteError}</p>}
        {quoteStatus && <p className="text-sm text-gold-deep">{quoteStatus}</p>}
        <button
          type="submit"
          className="w-fit rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink"
        >
          Submit Quote PDF
        </button>
        <p className="text-xs text-muted">
          Emails to {site.email} can be forwarded or assigned to individual
          agents via Google Workspace Collaborative Inbox, Gmail delegation, or
          filters on the selected agent name in the PDF.
        </p>
      </form>
    </div>
  );
}
