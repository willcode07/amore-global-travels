import { journeyStageIndex, journeySteps } from "@/lib/journey";
import { RequestStatus } from "@/lib/types";

export function StatusTracker({ status }: { status: RequestStatus }) {
  const currentIndex = journeyStageIndex(status);
  const confirmed = status === "booking_confirmed";

  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {journeySteps.map((step, index) => {
        const complete = index < currentIndex || confirmed;
        const current = index === currentIndex && !confirmed;
        return (
          <li
            key={step.title}
            className={`rounded-2xl border px-3 py-3 text-center text-xs md:text-sm ${
              complete || current
                ? "border-gold bg-cream text-ink"
                : "border-line bg-surface text-muted"
            }`}
          >
            <div
              className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                complete || current ? "bg-gold text-brand" : "bg-line text-muted"
              }`}
            >
              {complete ? "✓" : index + 1}
            </div>
            <div className={current ? "font-semibold" : ""}>{step.title}</div>
          </li>
        );
      })}
    </ol>
  );
}
