import { tripStatusTitle } from "@/lib/journey";
import { RequestStatus } from "@/lib/types";

export function StatusBadge({
  status,
  className = "",
}: {
  status: RequestStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex w-fit rounded-full bg-cream px-4 py-2 text-sm font-semibold text-gold-deep ${className}`}
    >
      {tripStatusTitle(status)}
    </span>
  );
}

export function CompleteTripDetailsButton({
  onClick,
  size = "md",
  complete = false,
}: {
  onClick: () => void;
  size?: "sm" | "md";
  complete?: boolean;
}) {
  const compact = size === "sm";
  if (complete) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-full bg-cream font-semibold text-gold-deep ${
          compact ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm"
        }`}
      >
        <span
          aria-hidden
          className={`inline-flex items-center justify-center rounded-full bg-gold font-bold text-on-gold ${
            compact ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-xs"
          }`}
        >
          ✓
        </span>
        Trip details complete
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full bg-gold font-semibold text-on-gold transition hover:brightness-95 ${
        compact ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm"
      }`}
    >
      <span
        aria-hidden
        className={`inline-flex items-center justify-center rounded-full bg-on-gold font-bold text-gold ${
          compact ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-xs"
        }`}
      >
        !
      </span>
      Complete trip details
    </button>
  );
}
