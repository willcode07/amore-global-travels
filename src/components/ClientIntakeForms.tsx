"use client";

import { FormEvent, useState } from "react";
import { QuoteIntakeForm } from "@/components/QuoteIntakeForm";
import { StartTravelButton } from "@/components/RequestModalProvider";
import {
  contactMailtoBody,
  downloadContactPdf,
  downloadQuotePdf,
  openMailtoWithBody,
  quoteMailtoBody,
  type ContactFormData,
} from "@/lib/pdf";
import { QuoteIntakeFields, toTripIntake } from "@/lib/intake";
import { createRequest } from "@/lib/requests";
import { site } from "@/lib/site";
import { TripType } from "@/lib/types";

type ClientIntakeFormsProps = {
  /** When true, quote submissions also create a local travel request. */
  createInboxRequest?: boolean;
  onQuoteCreated?: () => void;
  showQuoteLinkInContact?: boolean;
  showQuoteForm?: boolean;
  onOpenQuote?: () => void;
};

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
      />
    </label>
  );
}

export function ClientIntakeForms({
  createInboxRequest = false,
  onQuoteCreated,
  showQuoteLinkInContact = true,
  showQuoteForm = true,
  onOpenQuote,
}: ClientIntakeFormsProps) {
  const [contactStatus, setContactStatus] = useState("");
  const [quoteStatus, setQuoteStatus] = useState("");
  const [contactError, setContactError] = useState("");
  const [quoteFormKey, setQuoteFormKey] = useState(0);

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

  async function handleQuote(data: QuoteIntakeFields, tripType: TripType) {
    const filename = downloadQuotePdf(data);
    openMailtoWithBody(
      `Request a Quote: ${data.firstName || "Traveler"} ${data.lastName}`.trim(),
      quoteMailtoBody(data),
    );

    if (createInboxRequest) {
      const fullName =
        [data.firstName, data.lastName].filter(Boolean).join(" ") || "Demo Traveler";
      const travelWindow =
        data.departureDate && data.returnDate
          ? `${data.departureDate} – ${data.returnDate}`
          : data.departureDate || data.returnDate || "Flexible dates";
      const travelers =
        (Number(data.adultsCount) || 0) + (Number(data.childrenCount) || 0) || 1;

      await createRequest({
        fullName,
        email: data.email,
        phone: data.phone,
        destination: data.destination,
        departureCity: data.city,
        travelWindow,
        travelers,
        preferredAgent: data.preferredAgent,
        tripType,
        persistSession: !createInboxRequest,
        preferences: data.preferences,
        intake: toTripIntake(data, tripType),
      });
      onQuoteCreated?.();
    }

    setQuoteStatus(
      `PDF downloaded (${filename}). Email client opened for ${site.email}.`,
    );
    setQuoteFormKey((key) => key + 1);
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
          <span className="mb-1.5 block font-medium text-ink">General questions</span>
          <textarea
            name="contactMessage"
            rows={4}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
          />
        </label>
        {contactError && <p className="text-sm text-red-700">{contactError}</p>}
        {contactStatus && <p className="text-sm text-gold-deep">{contactStatus}</p>}
        <button
          type="submit"
          className="w-fit rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold"
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
              <StartTravelButton className="font-semibold text-gold-deep underline underline-offset-2">
                Request a Quote
              </StartTravelButton>
            )}
          </p>
        )}
      </form>

      {showQuoteForm ? (
        <div>
          <QuoteIntakeForm
            key={quoteFormKey}
            stage="full"
            title="Request a Quote"
            description={`Full questionnaire. PDF routes to ${site.email}${
              createInboxRequest ? " and creates an inbox request." : "."
            }`}
            submitLabel="Submit Quote PDF"
            notesLabel="Travel preferences"
            notesPlaceholder="Eg. Cruise Port, Balcony, Ocean View, Airport Location, Travel Times, etc."
            showPdfNote
            onSubmit={handleQuote}
          />
          {quoteStatus ? <p className="mt-3 text-sm text-gold-deep">{quoteStatus}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
