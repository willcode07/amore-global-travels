import { journeyStageIndex, statusForJourneyStage, tripStatusSteps } from "@/lib/journey";
import { RequestStatus } from "@/lib/types";

export function StatusTracker({
  status,
  onSelectStage,
  disabled,
}: {
  status: RequestStatus;
  onSelectStage?: (status: RequestStatus) => void;
  disabled?: boolean;
}) {
  const currentIndex = journeyStageIndex(status);
  const confirmed = status === "booking_confirmed";
  const last = tripStatusSteps.length - 1;
  const interactive = Boolean(onSelectStage);

  return (
    <ol className="grid grid-cols-3">
      {tripStatusSteps.map((step, index) => {
        const complete = index < currentIndex || confirmed;
        const current = index === currentIndex && !confirmed;
        const marker = (
          <div
            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
              complete
                ? "bg-gold text-on-gold"
                : current
                  ? "border-2 border-gold bg-surface text-gold-deep"
                  : "border border-line bg-surface text-muted"
            }`}
          >
            {complete ? "✓" : index + 1}
          </div>
        );
        const label = (
          <p
            className={`mt-2 text-xs leading-snug md:text-sm ${
              current ? "font-semibold text-ink" : complete ? "text-ink" : "text-muted"
            }`}
          >
            {step.title}
          </p>
        );
        return (
          <li key={step.title} className="relative flex flex-col items-center px-1 text-center">
            {index > 0 ? (
              <span
                className={`absolute right-1/2 top-4 h-px w-full ${
                  index <= currentIndex || confirmed ? "bg-gold" : "bg-line"
                }`}
                aria-hidden
              />
            ) : null}
            {index < last ? (
              <span
                className={`absolute left-1/2 top-4 h-px w-full ${
                  index < currentIndex || confirmed ? "bg-gold" : "bg-line"
                }`}
                aria-hidden
              />
            ) : null}
            {interactive ? (
              <button
                type="button"
                disabled={disabled}
                aria-current={current ? "step" : undefined}
                aria-pressed={current || (confirmed && index === last)}
                onClick={() => onSelectStage?.(statusForJourneyStage(index))}
                className="relative z-10 flex flex-col items-center rounded-2xl px-1 py-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {marker}
                {label}
              </button>
            ) : (
              <div className="relative z-10 flex flex-col items-center" aria-current={current ? "step" : undefined}>
                {marker}
                {label}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
