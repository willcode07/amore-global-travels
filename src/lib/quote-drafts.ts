import type { TravelProposal } from "@/lib/types";

function draftKey(requestId: string, mode = "quote") {
  return `amore_quote_draft:${requestId}:${mode}`;
}

export function readQuoteDraft(requestId: string, mode = "quote"): TravelProposal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(draftKey(requestId, mode)) ??
      (mode === "quote" ? window.localStorage.getItem(`amore_quote_draft:${requestId}`) : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TravelProposal;
    if (!parsed || typeof parsed !== "object" || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeQuoteDraft(requestId: string, quote: TravelProposal, mode = "quote") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(requestId, mode), JSON.stringify(quote));
  } catch {
    // Quota or private mode — skip; explicit Save draft still tries once.
  }
}

export function clearQuoteDraft(requestId: string, mode = "quote") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(requestId, mode));
    if (mode === "quote") window.localStorage.removeItem(`amore_quote_draft:${requestId}`);
  } catch {
    // ignore
  }
}
