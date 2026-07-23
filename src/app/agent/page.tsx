"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClientIntakeForms } from "@/components/ClientIntakeForms";
import { MessageThread } from "@/components/MessageThread";
import { StatusTracker } from "@/components/StatusTracker";
import { statusLabels, statusOrder } from "@/lib/agents";
import { listRequests, updateRequest } from "@/lib/requests";
import { site } from "@/lib/site";
import { RequestStatus, TravelRequest } from "@/lib/types";

const AGENT_KEY = "amore_agent_unlocked";

export default function AgentPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showClientForms, setShowClientForms] = useState(false);

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  );

  useEffect(() => {
    if (localStorage.getItem(AGENT_KEY) === "1") {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  async function loadRequests() {
    const next = listRequests();
    setRequests(next);
    if (!selectedId && next[0]) {
      setSelectedId(next[0].id);
    }
  }

  function handleUnlock(event: FormEvent) {
    event.preventDefault();
    const expected = process.env.NEXT_PUBLIC_AGENT_PASSCODE || "amore-agents";
    if (passcode.trim() !== expected) {
      setError("Incorrect agent passcode.");
      return;
    }
    localStorage.setItem(AGENT_KEY, "1");
    setUnlocked(true);
    setError("");
  }

  async function updateStatus(status: RequestStatus) {
    if (!selected) return;
    if (selected.status === status) return;
    setSaving(true);
    setError("");
    try {
      const updated = updateRequest(selected.id, { status });
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setSaving(false);
    }
  }

  async function addOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const updated = updateRequest(selected.id, {
        option: {
          title: String(form.get("title") ?? ""),
          summary: String(form.get("summary") ?? ""),
          estimatedPrice: String(form.get("estimatedPrice") ?? ""),
          highlights: String(form.get("highlights") ?? ""),
          flyerUrl: String(form.get("flyerUrl") ?? ""),
        },
      });
      event.currentTarget.reset();
      await loadRequests();
      setSelectedId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add option.");
    } finally {
      setSaving(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <form
          onSubmit={handleUnlock}
          className="rounded-3xl border border-line bg-surface p-8"
        >
          <h1 className="font-display text-3xl text-ink">Agent inbox</h1>
          <p className="mt-2 text-sm text-muted">
            Simple passcode gate for Alfreda, Shonya, Stephanie, and other agents.
          </p>
          <input
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            type="password"
            placeholder="Agent passcode"
            className="mt-6 w-full rounded-xl border border-line px-4 py-3 outline-none ring-gold focus:ring-2"
          />
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className="mt-4 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink"
          >
            Enter inbox
          </button>
          <p className="mt-4 text-xs text-muted">
            Default local passcode: <code>amore-agents</code>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">
            Agent tools
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Travel request inbox</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Review traveler requests, publish options, update status, and message
            travelers. Client forms route PDFs to {site.email}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowClientForms((open) => !open)}
            className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink"
          >
            {showClientForms ? "Hide client forms" : "Open client forms"}
          </button>
          <button
            type="button"
            onClick={() => loadRequests()}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {showClientForms && (
        <section className="mb-10 rounded-3xl bg-cream p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-ink">
                Contact Us &amp; Request a Quote
              </h2>
              <p className="mt-1 text-sm text-muted">
                Expanded fillable forms for post-call intake. PDFs go to{" "}
                {site.email}; quote submits also land in this inbox.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowClientForms(false)}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold"
            >
              Close
            </button>
          </div>
          <ClientIntakeForms
            createInboxRequest
            onQuoteCreated={() => {
              void loadRequests();
            }}
          />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-line bg-surface p-4">
          <h2 className="px-2 font-display text-xl text-ink">Requests</h2>
          <div className="mt-3 space-y-2">
            {requests.length === 0 && (
              <p className="px-2 py-4 text-sm text-muted">No requests yet.</p>
            )}
            {requests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelectedId(request.id)}
                className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                  selectedId === request.id
                    ? "bg-cream"
                    : "hover:bg-[#faf8f4]"
                }`}
              >
                <div className="font-semibold text-ink">
                  {request.traveler.fullName}
                </div>
                <div className="text-sm text-muted">{request.trip.destination}</div>
                <div className="mt-1 text-xs font-medium text-gold-deep">
                  {statusLabels[request.status]}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {!selected ? (
          <div className="rounded-3xl border border-line bg-surface p-8 text-muted">
            Select a request to manage it, or open client forms to create one.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl text-ink">
                    {selected.trip.destination}
                  </h2>
                  <p className="mt-1 text-muted">
                    {selected.traveler.fullName} · {selected.traveler.email} ·{" "}
                    {selected.traveler.phone}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Preferred agent: {selected.trip.preferredAgent || "—"}
                  </p>
                </div>
                <div className="rounded-full bg-cream px-4 py-2 text-sm font-semibold text-gold-deep">
                  Code {selected.accessCode}
                </div>
              </div>

              <div className="mt-6">
                <StatusTracker status={selected.status} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {statusOrder.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={saving}
                    onClick={() => updateStatus(status)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      selected.status === status
                        ? "bg-gold text-ink"
                        : "border border-line bg-white text-muted"
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>

              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Travel window</dt>
                  <dd className="font-medium">{selected.trip.travelWindow}</dd>
                </div>
                <div>
                  <dt className="text-muted">Budget</dt>
                  <dd className="font-medium">{selected.trip.budget || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Travelers</dt>
                  <dd className="font-medium">{selected.trip.travelers}</dd>
                </div>
                <div>
                  <dt className="text-muted">Trip style</dt>
                  <dd className="font-medium">
                    {selected.trip.tripStyle.join(", ") || "—"}
                  </dd>
                </div>
              </dl>
              {selected.trip.preferences && (
                <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-cream px-4 py-3 text-sm">
                  {selected.trip.preferences}
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
              <h3 className="font-display text-2xl text-ink">Add a travel option</h3>
              <p className="mt-1 text-sm text-muted">
                Paste a Canva flyer link if you still design options there. Travelers
                can open it from their dashboard.
              </p>
              <form onSubmit={addOption} className="mt-5 grid gap-3">
                <input
                  name="title"
                  required
                  placeholder="Option title (e.g. Santorini Resort Package)"
                  className="rounded-xl border border-line px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
                />
                <input
                  name="estimatedPrice"
                  placeholder="Estimated price"
                  className="rounded-xl border border-line px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
                />
                <textarea
                  name="summary"
                  required
                  rows={3}
                  placeholder="Short summary of this option"
                  className="rounded-xl border border-line px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
                />
                <textarea
                  name="highlights"
                  rows={3}
                  placeholder={"Highlights (one per line)\nAirport transfer included\n3 nights hotel"}
                  className="rounded-xl border border-line px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
                />
                <input
                  name="flyerUrl"
                  type="url"
                  placeholder="Canva / flyer URL (optional)"
                  className="rounded-xl border border-line px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="w-fit rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Publish option to traveler"}
                </button>
              </form>

              {selected.options.length > 0 && (
                <div className="mt-6 space-y-3">
                  {selected.options.map((option) => (
                    <div key={option.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
                      <div className="font-semibold text-ink">{option.title}</div>
                      <div className="text-gold-deep">{option.estimatedPrice}</div>
                      <p className="mt-1 text-muted">{option.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <MessageThread
              messages={selected.messages}
              sender="agent"
              senderName="Amore Global Agent"
              requestId={selected.id}
              onSent={async () => {
                await loadRequests();
              }}
            />

            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
