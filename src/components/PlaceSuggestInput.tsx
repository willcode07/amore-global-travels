"use client";

import { useId } from "react";
import {
  PlaceKind,
  PlaceSuggestion,
  bestPlaceMatch,
  ghostRemainder,
  suggestionFromLabel,
} from "@/lib/places";

type PlaceSuggestInputProps = {
  kind: PlaceKind;
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onResolved?: (place: PlaceSuggestion) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
};

export function PlaceSuggestInput({
  kind,
  name,
  label,
  value,
  onChange,
  onResolved,
  placeholder,
  required,
  autoComplete,
}: PlaceSuggestInputProps) {
  const inputId = useId();
  const match = bestPlaceMatch(value, kind);
  const remainder = ghostRemainder(value, match);
  const nativeComplete =
    autoComplete ??
    (kind === "address" ? "street-address" : kind === "city" ? "address-level2" : "off");

  function accept(next: string) {
    if (!next || next === value) return;
    onChange(next);
    onResolved?.(suggestionFromLabel(kind, next));
  }

  const input = (
    <div className="relative rounded-xl bg-surface">
      {remainder ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 truncate px-4 py-3 text-ink"
        >
          <span className="invisible">{value}</span>
          <span className="text-muted">{remainder}</span>
        </div>
      ) : null}
      <input
        id={inputId}
        name={name}
        value={value}
        required={required}
        autoComplete={nativeComplete}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          if (match) accept(match);
        }}
        onKeyDown={(event) => {
          if (!match || !remainder) return;
          const atEnd =
            event.currentTarget.selectionStart === value.length &&
            event.currentTarget.selectionEnd === value.length;
          if (event.key === "ArrowRight" && atEnd) {
            event.preventDefault();
            accept(match);
          }
        }}
        className="relative w-full rounded-xl border border-line bg-transparent px-4 py-3 outline-none ring-gold focus:ring-2"
      />
    </div>
  );

  if (!label) return input;

  return (
    <div className="block text-sm">
      <label htmlFor={inputId} className="mb-1.5 block font-medium text-ink">
        {label}
        {required ? " *" : ""}
      </label>
      {input}
    </div>
  );
}
