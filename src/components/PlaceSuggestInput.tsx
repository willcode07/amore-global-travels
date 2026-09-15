"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlaceKind, PlaceSuggestion, searchPlaces } from "@/lib/places";

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
  autoComplete = "off",
}: PlaceSuggestInputProps) {
  const listId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [box, setBox] = useState<DOMRect | null>(null);

  function measure() {
    const input = rootRef.current?.querySelector("input");
    if (input) setBox(input.getBoundingClientRect());
  }

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchPlaces(query, kind, controller.signal).then((results) => {
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setActive(0);
      });
    }, 280);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [kind, value]);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    function close() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("amore-close-places", close);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("amore-close-places", close);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    function onReposition() {
      measure();
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, suggestions.length]);

  function choose(place: PlaceSuggestion) {
    onChange(kind === "address" ? place.address1 || place.label : place.label);
    onResolved?.(place);
    setOpen(false);
  }

  const showList = open && suggestions.length > 0 && box !== null;

  const input = (
    <div ref={rootRef} className="relative">
      <input
        id={inputId}
        name={name}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => {
          setOpen(true);
          measure();
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!showList) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, suggestions.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            const place = suggestions[active];
            if (place) choose(place);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none ring-gold focus:ring-2"
      />
      {showList && box && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              style={{
                position: "fixed",
                top: box.bottom + 4,
                left: box.left,
                width: box.width,
              }}
              className="z-[90] max-h-64 overflow-auto rounded-2xl border border-line bg-surface py-1 shadow-[var(--shadow-soft)]"
            >
              {suggestions.map((place, index) => (
                <li key={place.id} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(place)}
                    className={`flex w-full flex-col px-4 py-2.5 text-left text-sm ${
                      index === active ? "bg-cream" : "bg-surface"
                    }`}
                  >
                    <span className="font-medium text-ink">{place.label}</span>
                    {place.detail ? (
                      <span className="mt-0.5 text-xs text-muted">{place.detail}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
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
