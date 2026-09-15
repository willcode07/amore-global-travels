import { ActivityItem, formatActivityTime } from "@/lib/activity";

export function ActivityLog({
  items,
  embedded = false,
}: {
  items: ActivityItem[];
  embedded?: boolean;
}) {
  const list = (
    <ol className={embedded ? "max-h-80 overflow-y-auto" : "max-h-80 overflow-y-auto px-5 py-3"}>
      {items.length === 0 ? (
        <li className="py-6 text-sm text-muted">No activity yet.</li>
      ) : (
        items.map((item) => (
          <li
            key={item.id}
            className="flex gap-3 border-b border-line/70 py-3 last:border-b-0"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            <div className="min-w-0">
              <p className="text-sm text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted">{formatActivityTime(item.at)}</p>
            </div>
          </li>
        ))
      )}
    </ol>
  );

  if (embedded) return list;

  return (
    <section className="rounded-3xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h3 className="font-display text-xl text-ink">Activity</h3>
        <p className="mt-1 text-sm text-muted">Sign-ins and emails for this trip.</p>
      </div>
      {list}
    </section>
  );
}
