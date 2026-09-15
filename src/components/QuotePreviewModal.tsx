"use client";

import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { QuoteDocument } from "@/components/QuoteDocument";
import type { TravelProposal, TravelRequest } from "@/lib/types";

export type QuotePreviewModalProps = {
  open: boolean;
  quote: TravelProposal;
  request: TravelRequest;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute("aria-hidden") !== "true" && element.tabIndex !== -1,
  );
}

export function QuotePreviewModal({
  open,
  quote,
  request,
  onClose,
}: QuotePreviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("keydown", onDocumentKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const elements = focusableElements(dialog);
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  const proposalName = quote.occasionTitle.trim() || "Travel proposal";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171c19]/80 p-0 sm:p-4"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-preview-modal-title"
        aria-describedby="quote-preview-modal-description"
        onKeyDown={handleDialogKeyDown}
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f7f3eb] shadow-2xl sm:h-[calc(100dvh-2rem)] sm:max-w-[1440px] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e4ddd0] bg-white px-5 py-4 md:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5600]">
              Quote preview
            </p>
            <h2
              id="quote-preview-modal-title"
              className="mt-1 font-display text-2xl text-[#171c19] md:text-3xl"
            >
              {proposalName}
            </h2>
            <p id="quote-preview-modal-description" className="mt-1 text-sm text-[#5e6762]">
              Review the traveler-facing proposal in a larger, scrollable view.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#e4ddd0] bg-white px-3 py-2 text-sm font-semibold text-[#171c19] outline-none ring-[#c9a227] focus:ring-2"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
            <span>Close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 md:px-8">
          <div className="mx-auto w-full max-w-[1120px] pb-8">
            <QuoteDocument quote={quote} request={request} />
          </div>
        </div>
      </div>
    </div>
  );
}
