"use client";

import { useState } from "react";
import { isApiBackend } from "@/lib/data/mode";
import { uploadTripFile } from "@/lib/uploads";

export function FileUploadField({
  tripId,
  kind,
  quoteId,
  label,
  onUploaded,
}: {
  tripId: string;
  kind: string;
  quoteId?: string;
  label: string;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isApiBackend()) return null;

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
        disabled={busy}
        className="w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          setError("");
          try {
            const stored = await uploadTripFile({ file, tripId, kind, quoteId });
            onUploaded(stored.url);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy ? <p className="mt-1 text-xs text-muted">Uploading…</p> : null}
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </label>
  );
}
