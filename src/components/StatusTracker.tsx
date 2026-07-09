import { statusLabels, statusOrder } from "@/lib/agents";
import { RequestStatus } from "@/lib/types";

export function StatusTracker({ status }: { status: RequestStatus }) {
  const currentIndex = statusOrder.indexOf(status);

  return (
    <ol className="grid gap-3 sm:grid-cols-5">
      {statusOrder.map((step, index) => {
        const complete = index <= currentIndex;
        const current = index === currentIndex;
        return (
          <li
            key={step}
            className={`rounded-2xl border px-3 py-3 text-center text-xs md:text-sm ${
              complete
                ? "border-gold bg-cream text-ink"
                : "border-line bg-surface text-muted"
            }`}
          >
            <div
              className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                complete ? "bg-gold text-ink" : "bg-line text-muted"
              }`}
            >
              {complete && !current ? "✓" : index + 1}
            </div>
            <div className={current ? "font-semibold" : ""}>
              {statusLabels[step]}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
