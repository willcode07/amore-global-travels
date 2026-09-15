"use client";

import { useState } from "react";
import { QuoteIntakeForm } from "@/components/QuoteIntakeForm";
import { tripTypeLabels } from "@/lib/agents";
import {
  formatDisplayDate,
  formatIntakeAddress,
  formatPartySummary,
  formatTravelWindow,
  isIntakeComplete,
  QuoteIntakeFields,
  quoteDefaultsFromRequest,
} from "@/lib/intake";
import { TravelRequest, TripIntake, TripType } from "@/lib/types";

function Item({ label, value }: { label: string; value?: string | null }) {
  const text = value?.trim();
  if (!text) return null;
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap font-medium text-ink">{text}</dd>
    </div>
  );
}

function uspsStreet(intake: TripIntake) {
  return [intake.address1, intake.address2].map((part) => part.trim()).filter(Boolean).join("\n");
}

function uspsCityLine(intake: TripIntake) {
  const city = intake.city.trim();
  const rest = [intake.state.trim(), intake.zip.trim()].filter(Boolean).join(" ");
  return [city, rest].filter(Boolean).join(", ");
}

function RequestSnapshot({ request }: { request: TravelRequest }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <Item label="Name" value={request.traveler.fullName} />
      <Item label="Email" value={request.traveler.email} />
      <Item label="Phone" value={request.traveler.phone} />
      <Item label="Destination" value={request.trip.destination} />
      <Item label="Travel window" value={request.trip.travelWindow} />
      <Item label="Travelers" value={String(request.trip.travelers || "")} />
      <Item label="Budget" value={request.trip.budget} />
      <Item
        label="Trip type"
        value={tripTypeLabels[request.trip.tripType] ?? request.trip.tripType}
      />
      <Item label="Trip style" value={request.trip.tripStyle.join(", ")} />
      <Item label="Preferred agent" value={request.trip.preferredAgent} />
      <Item label="Notes" value={request.trip.preferences} />
    </dl>
  );
}

function IntakeSnapshot({ intake }: { intake: TripIntake }) {
  const animals = [
    intake.pets ? "Pets" : "",
    intake.supportAnimal ? "Support animal" : "",
  ]
    .filter(Boolean)
    .join(", ");
  const accessibility = [
    intake.accessibilityNeeded,
    intake.accessibilityNotes,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" — ");

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <Item label="Name" value={[intake.firstName, intake.lastName].filter(Boolean).join(" ")} />
      <Item label="Notes" value={intake.notes} />
      <Item label="Address" value={uspsStreet(intake) || formatIntakeAddress(intake)} />
      <Item label="City, state, ZIP" value={uspsCityLine(intake)} />
      <Item label="Destination" value={intake.destination} />
      <Item
        label="Travel window"
        value={formatTravelWindow(intake.departureDate, intake.returnDate, "")}
      />
      <Item label="Email" value={intake.email} />
      <Item label="Phone" value={intake.phone} />
      <Item label="Preferred contact" value={intake.preferredContactMethods.join(", ")} />
      <Item label="Transportation" value={intake.transportationModes.join(", ")} />
      <Item label="Accessibility" value={accessibility} />
      <Item label="Party" value={formatPartySummary(intake)} />
      <Item label="Animals" value={animals} />
      <Item
        label="Trip type"
        value={tripTypeLabels[intake.tripType] ?? intake.tripType}
      />
      <Item label="Preferred agent" value={intake.preferredAgent} />
      {intake.completedAt ? (
        <Item label="Submitted" value={formatDisplayDate(intake.completedAt.slice(0, 10)) || intake.completedAt} />
      ) : null}
    </dl>
  );
}

export function AgentClientDetails({
  request,
  saving,
  onSave,
}: {
  request: TravelRequest | null;
  saving?: boolean;
  onSave: (data: QuoteIntakeFields, tripType: TripType) => Promise<void> | void;
}) {
  const complete = request ? isIntakeComplete(request) : false;
  const [editing, setEditing] = useState(!complete);

  async function handleSave(data: QuoteIntakeFields, tripType: TripType) {
    await onSave(data, tripType);
    setEditing(false);
  }

  if (!request) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-surface px-4 py-5 text-sm text-muted">
        Select a travel quote first to see the submitted client details.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {complete && request.intake ? (
        <div className="rounded-3xl border border-line bg-surface p-6">
          <h3 className="font-display text-xl text-ink">Submitted trip details</h3>
          <p className="mt-1 text-sm text-muted">
            What this traveler sent in for this quote.
          </p>
          <div className="mt-5">
            <IntakeSnapshot intake={request.intake} />
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-line bg-surface p-6">
          <h3 className="font-display text-xl text-ink">Submitted request</h3>
          <p className="mt-3 rounded-2xl border border-dashed border-line bg-cream px-4 py-3 text-sm text-ink">
            Waiting on trip details. Below is what they submitted with the quote request.
          </p>
          <div className="mt-5">
            <RequestSnapshot request={request} />
          </div>
        </div>
      )}

      {complete && !editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-semibold text-gold-deep"
        >
          Correct submitted details
        </button>
      ) : (
        <QuoteIntakeForm
          key={request.id}
          defaults={quoteDefaultsFromRequest(request)}
          title={complete ? "Correct trip details" : "Complete trip details"}
          description={
            complete
              ? "Edits save to this travel quote — they do not generate a new PDF."
              : "Save the questionnaire here so you can write a quote. This updates the selected travel quote."
          }
          submitLabel="Save trip details"
          notesLabel="Notes"
          showPdfNote={false}
          saving={saving}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}
