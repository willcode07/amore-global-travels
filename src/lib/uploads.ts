import { isApiBackend } from "@/lib/data/mode";

function apiPath(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path}`;
}

async function readError(res: Response) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error || `Request failed (${res.status})`;
}

export async function uploadTripFile(input: {
  file: File;
  tripId: string;
  kind?: string;
  quoteId?: string;
}) {
  if (!isApiBackend()) {
    throw new Error("File uploads need API mode and R2 credentials.");
  }
  const form = new FormData();
  form.append("file", input.file);
  form.append("tripId", input.tripId);
  form.append("kind", input.kind ?? "flyer");
  if (input.quoteId) form.append("quoteId", input.quoteId);
  const res = await fetch(apiPath("/api/uploads"), {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return (await res.json()) as { url: string; objectKey: string; attachmentId: string };
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiPath(path), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function logoutApiSession() {
  await fetch(apiPath("/api/auth/logout"), { method: "POST", credentials: "include" });
}
