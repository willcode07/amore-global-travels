"use client";

import { FormEvent, useMemo, useState } from "react";
import { PlaceSuggestInput } from "@/components/PlaceSuggestInput";
import { PhoneField } from "@/components/PhoneField";
import {
  agents,
  contactMethodOptions,
  transportationOptions,
  tripTypeOptions,
} from "@/lib/agents";
import {
  QuoteIntakeFields,
  IntakeStage,
  US_MAILING_COUNTRY,
  isUsMailingCountry,
  mailingCountries,
  resizeDobs,
  resizeList,
  toInputDate,
  validateQuoteIntake,
} from "@/lib/intake";
import { lookupUsZip } from "@/lib/places";
import { site } from "@/lib/site";
import { TripType } from "@/lib/types";
import { usStates } from "@/lib/us-states";

type QuoteIntakeFormProps = {
  defaults?: Partial<QuoteIntakeFields> & { tripType?: TripType };
  title?: string;
  description?: string;
  submitLabel?: string;
  notesLabel?: string;
  notesPlaceholder?: string;
  showPdfNote?: boolean;
  framed?: boolean;
  saving?: boolean;
  stage?: IntakeStage;
  onSubmit: (data: QuoteIntakeFields, tripType: TripType) => Promise<void> | void;
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
        active ? "bg-gold text-on-gold" : "border border-line bg-surface text-muted"
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
  value,
  onChange,
  defaultValue,
  required,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border bg-surface px-4 py-3 outline-none ring-gold focus:ring-2 ${
          error ? "border-red-500" : "border-line"
        }`}
      />
      {error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function DateField({
  label,
  name,
  value,
  onChange,
  required,
  min,
  max,
  error,
}: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  error?: string;
}) {
  return (
    <label className="relative z-0 block text-sm">
      <span className="mb-1.5 block font-medium text-ink">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        name={name}
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        aria-invalid={Boolean(error)}
        onFocus={() => document.dispatchEvent(new Event("amore-close-places"))}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border bg-surface px-4 py-3 outline-none ring-gold focus:ring-2 ${
          error ? "border-red-500" : "border-line"
        }`}
      />
      {error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

export function QuoteIntakeForm({
  defaults = {},
  title = "Trip details",
  description,
  submitLabel = "Save trip details",
  notesLabel = "Notes to the Agent",
  notesPlaceholder = "Cruise port, balcony, travel times, celebrations, anything else we should know.",
  showPdfNote = false,
  framed = true,
  saving = false,
  stage = "full",
  onSubmit,
}: QuoteIntakeFormProps) {
  const [contactMethods, setContactMethods] = useState<string[]>(
    defaults.preferredContactMethods ?? [],
  );
  const [transportModes, setTransportModes] = useState<string[]>(() => {
    const modes = defaults.transportationModes ?? [];
    if ((defaults.tripType ?? "not_sure") === "cruise" && !modes.includes("Cruise")) {
      return [...modes, "Cruise"];
    }
    return modes;
  });
  const [accessibilityNeeded, setAccessibilityNeeded] = useState(
    defaults.accessibilityNeeded ?? "",
  );
  const [pets, setPets] = useState(Boolean(defaults.pets));
  const [supportAnimal, setSupportAnimal] = useState(Boolean(defaults.supportAnimal));
  const [tripType, setTripType] = useState<TripType>(defaults.tripType ?? "not_sure");
  const [firstName, setFirstName] = useState(defaults.firstName ?? "");
  const [lastName, setLastName] = useState(defaults.lastName ?? "");
  const [phone, setPhone] = useState(defaults.phone ?? "");
  const [email, setEmail] = useState(defaults.email ?? "");
  const [address1, setAddress1] = useState(defaults.address1 ?? "");
  const [city, setCity] = useState(defaults.city ?? "");
  const [state, setState] = useState(defaults.state ?? "");
  const [zip, setZip] = useState(defaults.zip ?? "");
  const [country, setCountry] = useState(defaults.country || US_MAILING_COUNTRY);
  const usAddress = isUsMailingCountry(country);
  const [destination, setDestination] = useState(defaults.destination ?? "");
  const [departureDate, setDepartureDate] = useState(toInputDate(defaults.departureDate ?? ""));
  const [returnDate, setReturnDate] = useState(toInputDate(defaults.returnDate ?? ""));
  const [adultsCount, setAdultsCount] = useState(defaults.adultsCount ?? "2");
  const [childrenCount, setChildrenCount] = useState(defaults.childrenCount ?? "0");
  const [adultDobs, setAdultDobs] = useState(() =>
    resizeDobs(defaults.adultDobs, Number(defaults.adultsCount ?? "2") || 2),
  );
  const [childDobs, setChildDobs] = useState(() =>
    resizeDobs(defaults.childDobs, Number(defaults.childrenCount ?? "0") || 0),
  );
  const [adultNames, setAdultNames] = useState(() =>
    resizeList(defaults.adultNames, Number(defaults.adultsCount ?? "2") || 2, ""),
  );
  const [childNames, setChildNames] = useState(() =>
    resizeList(defaults.childNames, Number(defaults.childrenCount ?? "0") || 0, ""),
  );
  const [datesFlexible, setDatesFlexible] = useState(Boolean(defaults.datesFlexible));
  const [nickname, setNickname] = useState(defaults.nickname ?? defaults.destination ?? "");
  const booking = stage === "booking" || stage === "full";
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const maxDob = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }, []);

  function selectTripType(next: TripType) {
    setTripType(next);
    if (next === "cruise") {
      setTransportModes((current) =>
        current.includes("Cruise") ? current : [...current, "Cruise"],
      );
    }
  }

  function collectData(form: FormData): QuoteIntakeFields {
    return {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address1: address1.trim(),
      address2: String(form.get("address2") ?? "").trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      country,
      phone: phone.trim(),
      email: email.trim(),
      preferredContactMethods: contactMethods,
      destination: destination.trim(),
      transportationModes:
        tripType === "cruise" && !transportModes.includes("Cruise")
          ? [...transportModes, "Cruise"]
          : transportModes,
      departureDate,
      returnDate,
      preferences: String(form.get("preferences") ?? "").trim(),
      accessibilityNeeded,
      accessibilityNotes: String(form.get("accessibilityNotes") ?? "").trim(),
      adultsCount: String(adultsCount).trim(),
      adultDobs,
      adultNames,
      childrenCount: String(childrenCount).trim(),
      childDobs,
      childNames,
      pets,
      supportAnimal,
      preferredAgent: String(form.get("preferredAgent") ?? "").trim(),
      datesFlexible,
      nickname: nickname.trim() || destination.trim(),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const data = collectData(form);
    if (tripType === "cruise" && !transportModes.includes("Cruise")) {
      setTransportModes((current) =>
        current.includes("Cruise") ? current : [...current, "Cruise"],
      );
    }
    const result = validateQuoteIntake(data, tripType, stage);
    setFieldErrors(result.errors);
    setWarnings(result.warnings);
    if (Object.keys(result.errors).length > 0) {
      setError("Please fix the highlighted fields before saving.");
      return;
    }

    try {
      await onSubmit(data, tripType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save trip details.");
    }
  }

  const form = (
    <form id="trip-details-form" noValidate onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <h2 className="font-display text-2xl text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {Object.keys(fieldErrors).length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
          {Object.values(fieldErrors).map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      {warnings.map((message) => (
        <p key={message} className="text-sm text-gold-deep">
          {message}
        </p>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          name="firstName"
          value={firstName}
          onChange={setFirstName}
          autoComplete="given-name"
          required
          error={fieldErrors.firstName}
        />
        <Field
          label="Last name"
          name="lastName"
          value={lastName}
          onChange={setLastName}
          autoComplete="family-name"
          required
          error={fieldErrors.lastName}
        />
      </div>
      <Field
        label="Trip nickname"
        name="nickname"
        value={nickname}
        onChange={setNickname}
        placeholder="Paris anniversary, Jamaica with Mom…"
      />

      {booking ? (
      <div className="rounded-2xl border border-line bg-cream/60 p-4">
        <p className="text-sm font-medium text-ink">Booking details</p>
        <p className="mt-1 text-xs text-muted">
          Vendors need a mailing address and dates of birth to issue tickets.
        </p>
        <div className="mt-4 grid gap-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink">Country *</span>
        <select
          name="country"
          value={country}
          onChange={(event) => {
            const next = event.target.value;
            setCountry(next);
            if (isUsMailingCountry(next) && state && !usStates.includes(state as (typeof usStates)[number])) {
              setState("");
            }
          }}
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
        >
          {mailingCountries.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <Field
        label="Address 1"
        name="address1"
        value={address1}
        onChange={setAddress1}
        autoComplete="street-address"
        placeholder="Street address"
        required={booking}
        error={fieldErrors.address1}
      />
      <Field
        label="Address 2"
        name="address2"
        placeholder="Apt, suite, unit"
        defaultValue={defaults.address2}
        autoComplete="address-line2"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="City"
          name="city"
          value={city}
          onChange={setCity}
          autoComplete="address-level2"
          placeholder="City"
          required={booking}
          error={fieldErrors.city}
        />
        {usAddress ? (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">State *</span>
          <select
            name="state"
            value={state}
            required={booking}
            onChange={(event) => setState(event.target.value)}
            className={`w-full rounded-xl border bg-surface px-4 py-3 outline-none ring-gold focus:ring-2 ${
              fieldErrors.state ? "border-red-500" : "border-line"
            }`}
          >
            <option value="">Select</option>
            {usStates.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {fieldErrors.state ? (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.state}</span>
          ) : null}
        </label>
        ) : (
          <Field
            label="Region / province"
            name="state"
            value={state}
            onChange={setState}
            required={booking}
            error={fieldErrors.state}
          />
        )}
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">
            {usAddress ? "ZIP code *" : "Postal code *"}
          </span>
          <input
            name="zip"
            value={zip}
            required={booking}
            autoComplete="postal-code"
            inputMode={usAddress ? "numeric" : "text"}
            onChange={(event) => setZip(event.target.value)}
            onBlur={async () => {
              if (!usAddress) return;
              const match = await lookupUsZip(zip);
              if (!match) return;
              setZip(match.zip);
              if (match.city) setCity(match.city);
              if (match.state) setState(match.state);
            }}
            className={`w-full rounded-xl border bg-surface px-4 py-3 outline-none ring-gold focus:ring-2 ${
              fieldErrors.zip ? "border-red-500" : "border-line"
            }`}
          />
          {fieldErrors.zip ? (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.zip}</span>
          ) : null}
        </label>
      </div>
      <p className="-mt-1 text-xs text-muted">
        {usAddress
          ? "ZIP fills city and state when it matches a US code."
          : "Use the region and postal code from the traveler’s home country."}
      </p>
        </div>
      </div>
      ) : (
        <p className="text-sm text-muted">
          Address, dates of birth, and how you’ll travel wait until you choose an option.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <PhoneField
          label="Phone number"
          value={phone}
          onChange={setPhone}
          required
          error={fieldErrors.phone}
        />
        <Field
          label="Email address"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
          error={fieldErrors.email}
        />
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
              onClick={() => toggleValue(method, contactMethods, setContactMethods)}
            />
          ))}
        </div>
      </fieldset>

      <div>
        <PlaceSuggestInput
          kind="destination"
          name="destination"
          label="Desired destination"
          value={destination}
          onChange={setDestination}
          placeholder="Jamaica, Ghana, a cruise from Miami..."
          required
        />
        {fieldErrors.destination ? (
          <p className="mt-1 text-xs text-red-700">{fieldErrors.destination}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted">
          Country or city abroad, such as Cancun, Accra, or London.
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">What kind of trip? *</legend>
        <div className="flex flex-wrap gap-2">
          {tripTypeOptions.map((option) => (
            <Chip
              key={option.id}
              label={option.label}
              active={tripType === option.id}
              onClick={() => selectTripType(option.id)}
            />
          ))}
        </div>
        {fieldErrors.tripType ? (
          <p className="mt-1 text-xs text-red-700">{fieldErrors.tripType}</p>
        ) : null}
      </fieldset>

      {booking ? (
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">
          Mode of transportation (all that apply) *
        </legend>
        <p className="mb-2 text-xs text-muted">
          How this party will get there — needed to book flights, transfers, or a cruise.
        </p>
        <div className="flex flex-wrap gap-2">
          {transportationOptions.map((mode) => (
            <Chip
              key={mode}
              label={mode}
              active={transportModes.includes(mode)}
              onClick={() => {
                if (tripType === "cruise" && mode === "Cruise") return;
                toggleValue(mode, transportModes, setTransportModes);
              }}
            />
          ))}
        </div>
        {fieldErrors.transportationModes ? (
          <p className="mt-1 text-xs text-red-700">{fieldErrors.transportationModes}</p>
        ) : null}
      </fieldset>
      ) : null}

      <div>
        <label className="mb-3 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={datesFlexible}
            onChange={(event) => setDatesFlexible(event.target.checked)}
            className="h-4 w-4 rounded border-line"
          />
          Dates are still flexible
        </label>
        <p className="mb-3 text-xs text-muted">
          {datesFlexible
            ? "You can leave dates blank, or add a preferred window without locking the trip."
            : booking
              ? "Fixed dates are required to book."
              : "Optional for a quote. Add dates if you already know them."}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField
            label={datesFlexible ? "Preferred departure" : "Departure date"}
            name="departureDate"
            value={departureDate}
            onChange={(value) => {
              setDepartureDate(value);
              if (returnDate && value && returnDate < value) setReturnDate("");
            }}
            required={booking && !datesFlexible}
            error={fieldErrors.departureDate}
          />
          <DateField
            label={datesFlexible ? "Preferred return" : "Return date"}
            name="returnDate"
            value={returnDate}
            onChange={setReturnDate}
            min={departureDate || undefined}
            required={booking && !datesFlexible}
            error={fieldErrors.returnDate}
          />
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink">{notesLabel}</span>
        <textarea
          name="preferences"
          rows={3}
          defaultValue={defaults.preferences}
          placeholder={notesPlaceholder}
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
        />
      </label>

      {booking ? (
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">
          Disability accessibility needed? *
        </legend>
        <p className="mb-2 text-xs text-muted">
          Vendors need this before they can confirm rooms or cabins.
        </p>
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
        {fieldErrors.accessibilityNeeded ? (
          <p className="mt-1 text-xs text-red-700">{fieldErrors.accessibilityNeeded}</p>
        ) : null}
      </fieldset>
      ) : null}
      {booking && accessibilityNeeded === "Yes" && (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">
            Brief explanation (optional)
          </span>
          <textarea
            name="accessibilityNotes"
            rows={2}
            defaultValue={defaults.accessibilityNotes}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
          />
        </label>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-ink">Traveling party</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Adults *</span>
            <input
              name="adultsCount"
              type="number"
              min={1}
              max={12}
              required
              value={adultsCount}
              onChange={(event) => {
                const value = event.target.value;
                setAdultsCount(value);
                const count = Number(value);
                if (Number.isInteger(count) && count >= 1 && count <= 12) {
                  setAdultDobs((current) => resizeDobs(current, count));
                  setAdultNames((current) => resizeList(current, count, ""));
                }
              }}
              className={`w-full rounded-xl border bg-surface px-4 py-3 outline-none ring-gold focus:ring-2 ${
                fieldErrors.adultsCount ? "border-red-500" : "border-line"
              }`}
            />
            {fieldErrors.adultsCount ? (
              <span className="mt-1 block text-xs text-red-700">{fieldErrors.adultsCount}</span>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Children (17 and under)</span>
            <input
              name="childrenCount"
              type="number"
              min={0}
              max={12}
              value={childrenCount}
              onChange={(event) => {
                const value = event.target.value;
                setChildrenCount(value);
                const count = Number(value);
                if (Number.isInteger(count) && count >= 0 && count <= 12) {
                  setChildDobs((current) => resizeDobs(current, count));
                  setChildNames((current) => resizeList(current, count, ""));
                }
              }}
              className={`w-full rounded-xl border bg-surface px-4 py-3 outline-none ring-gold focus:ring-2 ${
                fieldErrors.childrenCount ? "border-red-500" : "border-line"
              }`}
            />
            {fieldErrors.childrenCount ? (
              <span className="mt-1 block text-xs text-red-700">
                {fieldErrors.childrenCount}
              </span>
            ) : null}
          </label>
        </div>
        {adultDobs.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {adultDobs.map((dob, index) => (
              <div key={`adult-${index}`} className="grid gap-3">
                <Field
                  label={index === 0 ? "Primary traveler name" : `Adult ${index + 1} name`}
                  name={`adultName-${index}`}
                  value={adultNames[index] ?? ""}
                  onChange={(next) => {
                    setAdultNames((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? next : item)),
                    );
                  }}
                  placeholder={index === 0 ? `${firstName} ${lastName}`.trim() : "First and last name"}
                />
                {booking ? (
                <DateField
                  label={`DOB Adult ${index + 1}`}
                  value={dob}
                  max={maxDob}
                  required
                  error={fieldErrors[`adultDob-${index}`]}
                  onChange={(next) => {
                    setAdultDobs((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? next : item)),
                    );
                  }}
                />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {childDobs.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {childDobs.map((dob, index) => (
              <div key={`child-${index}`} className="grid gap-3">
                <Field
                  label={`Child ${index + 1} name`}
                  name={`childName-${index}`}
                  value={childNames[index] ?? ""}
                  onChange={(next) => {
                    setChildNames((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? next : item)),
                    );
                  }}
                  placeholder="First and last name"
                />
                {booking ? (
                <DateField
                  label={`DOB Child ${index + 1}`}
                  value={dob}
                  max={maxDob}
                  required
                  error={fieldErrors[`childDob-${index}`]}
                  onChange={(next) => {
                    setChildDobs((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? next : item)),
                    );
                  }}
                />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {booking ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip label="Pets" active={pets} onClick={() => setPets((value) => !value)} />
          <Chip
            label="Support animal"
            active={supportAnimal}
            onClick={() => setSupportAnimal((value) => !value)}
          />
        </div>
        ) : null}
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink">Select your travel agent</span>
        <select
          name="preferredAgent"
          defaultValue={defaults.preferredAgent ?? ""}
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.name}>
              {agent.name || "—"}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-gold disabled:opacity-60"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
      {showPdfNote ? (
        <p className="text-xs text-muted">
          Emails to {site.email} can be forwarded or assigned to individual agents
          via Google Workspace Collaborative Inbox, Gmail delegation, or filters
          on the selected agent name in the PDF.
        </p>
      ) : null}
    </form>
  );

  if (!framed) return form;

  return (
    <div className="grid gap-4 rounded-3xl border border-line bg-surface p-6 md:p-8">{form}</div>
  );
}
