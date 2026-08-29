import {
  AddMessageInput,
  CreateRequestInput,
  UpdateRequestBody,
} from "@/lib/request-ops";
import { TravelRepository } from "@/lib/data/types";
import { TravelRequest } from "@/lib/types";

type TripResponse = { trip: TravelRequest };
type TripsResponse = { trips: TravelRequest[] };
type ErrorResponse = { error?: string };

function apiPath(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path}`;
}

async function parseError(res: Response) {
  const data = (await res.json().catch(() => ({}))) as ErrorResponse;
  return data.error || `Request failed (${res.status})`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiPath(path), {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as T;
}

let agentSessionPromise: Promise<void> | null = null;

async function ensureAgentSession() {
  if (agentSessionPromise) return agentSessionPromise;
  agentSessionPromise = (async () => {
    const me = await fetch(apiPath("/api/auth/me"), { credentials: "include" });
    if (me.ok) {
      const data = (await me.json()) as { role?: string };
      if (data.role === "agent") return;
    }
    const passcode = process.env.NEXT_PUBLIC_AGENT_PASSCODE || "amore-agents";
    await apiFetch("/api/agent/session", {
      method: "POST",
      body: JSON.stringify({ passcode }),
    });
  })().catch((err) => {
    agentSessionPromise = null;
    throw err;
  });
  return agentSessionPromise;
}

export function resetApiAuthCache() {
  agentSessionPromise = null;
}

export const apiRepository: TravelRepository = {
  async listAll() {
    await ensureAgentSession();
    const data = await apiFetch<TripsResponse>("/api/trips");
    return data.trips;
  },

  async findByTraveler(email, phone) {
    const params = new URLSearchParams({ email, phone });
    const data = await apiFetch<TripsResponse>(`/api/trips?${params.toString()}`);
    return data.trips;
  },

  async getById(id) {
    const data = await apiFetch<TripResponse>(`/api/trips/${encodeURIComponent(id)}`);
    return data.trip;
  },

  async create(input: CreateRequestInput) {
    const data = await apiFetch<TripResponse>("/api/trips", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return data.trip;
  },

  async update(id: string, body: UpdateRequestBody) {
    const data = await apiFetch<TripResponse>(
      `/api/trips/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    return data.trip;
  },

  async addMessage(id: string, input: AddMessageInput) {
    const data = await apiFetch<TripResponse>(
      `/api/trips/${encodeURIComponent(id)}/messages`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
    return data.trip;
  },
};
