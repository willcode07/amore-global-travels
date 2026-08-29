import postgres from "postgres";
import {
  AddMessageInput,
  CreateRequestInput,
  UpdateRequestBody,
  applyCreate,
  applyMessage,
  applyUpdate,
} from "@/lib/request-ops";
import { createId } from "@/lib/ids";
import { requireDb } from "@/lib/server/db";
import { buildQuotePdf } from "@/lib/server/quote-pdf";
import {
  isStorageConfigured,
  putObject,
  recordAttachment,
  safeFilename,
} from "@/lib/server/storage";
import { normalizeEmail, phonesMatch } from "@/lib/session";
import {
  Message,
  PaymentStatus,
  RequestStatus,
  TravelOption,
  TravelProposal,
  TravelRequest,
  TripType,
} from "@/lib/types";

type Sql = ReturnType<typeof requireDb>;
type ExecSql = postgres.Sql | postgres.TransactionSql;

type CustomerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
};

type TripRow = {
  id: string;
  customer_id: string;
  trip_ref: string;
  status: string;
  progress_status: string | null;
  payment_status: string;
  payment_note: string | null;
  destination: string;
  departure_city: string | null;
  travel_window: string;
  travelers: number;
  budget: string | null;
  trip_type: string;
  trip_style: unknown;
  preferences: string | null;
  preferred_agent: string | null;
  assigned_agent_id: string | null;
  selected_quote_id: string | null;
  selected_option_id: string | null;
  clientease_ref: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type QuoteRow = {
  id: string;
  proposal: TravelProposal | string;
  selected: boolean;
  created_at: Date | string;
};

type OptionRow = {
  id: string;
  title: string;
  summary: string | null;
  estimated_price: string | null;
  highlights: unknown;
  flyer_url: string | null;
  created_at: Date | string;
};

type MessageRow = {
  id: string;
  sender_role: string;
  sender_name: string;
  body: string;
  created_at: Date | string;
};

function asIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asProposal(row: QuoteRow): TravelProposal {
  const proposal =
    typeof row.proposal === "string"
      ? (JSON.parse(row.proposal) as TravelProposal)
      : row.proposal;
  return {
    ...proposal,
    id: proposal.id || row.id,
    createdAt: proposal.createdAt || asIso(row.created_at),
  };
}

function assemble(
  trip: TripRow,
  customer: CustomerRow,
  quotes: QuoteRow[],
  options: OptionRow[],
  messages: MessageRow[],
): TravelRequest {
  return {
    id: trip.id,
    tripRef: trip.trip_ref,
    status: trip.status as RequestStatus,
    progressStatus: (trip.progress_status ?? trip.status) as RequestStatus,
    paymentStatus: trip.payment_status as PaymentStatus,
    paymentNote: trip.payment_note ?? "",
    clienteaseRef: trip.clientease_ref,
    assignedAgentId: trip.assigned_agent_id,
    createdAt: asIso(trip.created_at),
    updatedAt: asIso(trip.updated_at),
    traveler: {
      fullName: customer.full_name,
      email: customer.email,
      phone: customer.phone,
    },
    trip: {
      destination: trip.destination,
      departureCity: trip.departure_city ?? "",
      travelWindow: trip.travel_window,
      travelers: Number(trip.travelers) || 1,
      budget: trip.budget ?? "",
      tripType: (trip.trip_type as TripType) || "not_sure",
      tripStyle: asStringArray(trip.trip_style),
      preferences: trip.preferences ?? "",
      preferredAgent: trip.preferred_agent ?? "",
    },
    selectedOptionId: trip.selected_option_id ?? undefined,
    selectedQuoteId: trip.selected_quote_id ?? undefined,
    options: options.map(
      (row): TravelOption => ({
        id: row.id,
        title: row.title,
        summary: row.summary ?? "",
        estimatedPrice: row.estimated_price ?? "",
        highlights: asStringArray(row.highlights),
        flyerUrl: row.flyer_url ?? undefined,
        createdAt: asIso(row.created_at),
      }),
    ),
    quotes: quotes.map(asProposal),
    messages: messages.map(
      (row): Message => ({
        id: row.id,
        sender: row.sender_role === "agent" ? "agent" : "traveler",
        senderName: row.sender_name,
        body: row.body,
        createdAt: asIso(row.created_at),
      }),
    ),
  };
}

async function loadChildren(sql: ExecSql, tripId: string) {
  const [quotes, options, messages] = await Promise.all([
    sql<QuoteRow[]>`
      SELECT id, proposal, selected, created_at
      FROM quotes
      WHERE trip_id = ${tripId}
      ORDER BY created_at ASC
    `,
    sql<OptionRow[]>`
      SELECT id, title, summary, estimated_price, highlights, flyer_url, created_at
      FROM travel_options
      WHERE trip_id = ${tripId}
      ORDER BY created_at ASC
    `,
    sql<MessageRow[]>`
      SELECT id, sender_role, sender_name, body, created_at
      FROM messages
      WHERE trip_id = ${tripId}
      ORDER BY created_at ASC
    `,
  ]);
  return { quotes, options, messages };
}

async function hydrate(
  sql: ExecSql,
  trip: TripRow,
  customer: CustomerRow,
): Promise<TravelRequest> {
  const children = await loadChildren(sql, trip.id);
  return assemble(trip, customer, children.quotes, children.options, children.messages);
}

async function upsertCustomer(sql: ExecSql, traveler: TravelRequest["traveler"]) {
  const now = new Date().toISOString();
  const emailNormalized = normalizeEmail(traveler.email);
  const phoneNormalized = traveler.phone.replace(/\D/g, "");
  const rows = await sql<CustomerRow[]>`
    INSERT INTO customers (
      id, full_name, email, email_normalized, phone, phone_normalized, created_at, updated_at
    )
    VALUES (
      ${createId("cust")},
      ${traveler.fullName},
      ${traveler.email},
      ${emailNormalized},
      ${traveler.phone},
      ${phoneNormalized},
      ${now},
      ${now}
    )
    ON CONFLICT (email_normalized, phone_normalized)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      updated_at = EXCLUDED.updated_at
    RETURNING id, full_name, email, phone
  `;
  return rows[0];
}

async function persistRequest(sql: Sql, request: TravelRequest) {
  await sql.begin(async (sql) => {
  const customer = await upsertCustomer(sql, request.traveler);
  await sql`
    INSERT INTO trips (
      id, customer_id, trip_ref, status, progress_status, payment_status, payment_note,
      destination, departure_city, travel_window, travelers, budget, trip_type, trip_style,
      preferences, preferred_agent, assigned_agent_id, selected_quote_id, selected_option_id,
      clientease_ref, created_at, updated_at
    )
    VALUES (
      ${request.id},
      ${customer.id},
      ${request.tripRef},
      ${request.status},
      ${request.progressStatus ?? request.status},
      ${request.paymentStatus},
      ${request.paymentNote},
      ${request.trip.destination},
      ${request.trip.departureCity},
      ${request.trip.travelWindow},
      ${request.trip.travelers},
      ${request.trip.budget},
      ${request.trip.tripType},
      ${sql.json(request.trip.tripStyle)},
      ${request.trip.preferences},
      ${request.trip.preferredAgent},
      ${request.assignedAgentId ?? null},
      ${request.selectedQuoteId ?? null},
      ${request.selectedOptionId ?? null},
      ${request.clienteaseRef ?? null},
      ${request.createdAt},
      ${request.updatedAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      customer_id = EXCLUDED.customer_id,
      trip_ref = EXCLUDED.trip_ref,
      status = EXCLUDED.status,
      progress_status = EXCLUDED.progress_status,
      payment_status = EXCLUDED.payment_status,
      payment_note = EXCLUDED.payment_note,
      destination = EXCLUDED.destination,
      departure_city = EXCLUDED.departure_city,
      travel_window = EXCLUDED.travel_window,
      travelers = EXCLUDED.travelers,
      budget = EXCLUDED.budget,
      trip_type = EXCLUDED.trip_type,
      trip_style = EXCLUDED.trip_style,
      preferences = EXCLUDED.preferences,
      preferred_agent = EXCLUDED.preferred_agent,
      assigned_agent_id = EXCLUDED.assigned_agent_id,
      selected_quote_id = EXCLUDED.selected_quote_id,
      selected_option_id = EXCLUDED.selected_option_id,
      clientease_ref = EXCLUDED.clientease_ref,
      updated_at = EXCLUDED.updated_at
  `;

  await sql`DELETE FROM quotes WHERE trip_id = ${request.id}`;
  await sql`DELETE FROM travel_options WHERE trip_id = ${request.id}`;
  await sql`DELETE FROM messages WHERE trip_id = ${request.id}`;

  for (const quote of request.quotes) {
    await sql`
      INSERT INTO quotes (id, trip_id, proposal, selected, created_at)
      VALUES (
        ${quote.id},
        ${request.id},
        ${sql.json(quote)},
        ${quote.id === request.selectedQuoteId},
        ${quote.createdAt}
      )
    `;
  }

  for (const option of request.options) {
    await sql`
      INSERT INTO travel_options (
        id, trip_id, title, summary, estimated_price, highlights, flyer_url, created_at
      )
      VALUES (
        ${option.id},
        ${request.id},
        ${option.title},
        ${option.summary},
        ${option.estimatedPrice},
        ${sql.json(option.highlights)},
        ${option.flyerUrl ?? null},
        ${option.createdAt}
      )
    `;
  }

  for (const message of request.messages) {
    await sql`
      INSERT INTO messages (id, trip_id, sender_role, sender_name, body, created_at)
      VALUES (
        ${message.id},
        ${request.id},
        ${message.sender},
        ${message.senderName},
        ${message.body},
        ${message.createdAt}
      )
    `;
  }
  });

  return request;
}

async function attachQuotePdf(request: TravelRequest, quoteId: string) {
  if (!isStorageConfigured()) return request;
  const quote = request.quotes.find((item) => item.id === quoteId);
  if (!quote || quote.pdfUrl) return request;
  try {
    const pdf = buildQuotePdf(request, quote);
    const key = `quotes/${request.id}/${quote.id}.pdf`;
    const stored = await putObject({
      key,
      body: pdf,
      contentType: "application/pdf",
    });
    await recordAttachment({
      tripId: request.id,
      quoteId: quote.id,
      kind: "quote_pdf",
      objectKey: stored.key,
      filename: safeFilename(`${request.tripRef}-quote.pdf`),
      contentType: "application/pdf",
    });
    const withPdf: TravelRequest = {
      ...request,
      quotes: request.quotes.map((item) =>
        item.id === quote.id ? { ...item, pdfUrl: stored.url } : item,
      ),
    };
    const sql = requireDb();
    await persistRequest(sql, withPdf);
    return withPdf;
  } catch (err) {
    console.error("[storage:quote-pdf]", err);
    return request;
  }
}

export async function listAgentDirectoryEmails() {
  const sql = requireDb();
  const rows = await sql<{ email: string | null }[]>`
    SELECT email FROM agents WHERE email IS NOT NULL AND email <> ''
  `;
  return rows.map((row) => row.email).filter((value): value is string => Boolean(value));
}

export async function listTripsForAgent() {
  const sql = requireDb();
  const rows = await sql<(TripRow & CustomerRow)[]>`
    SELECT
      t.*,
      c.full_name,
      c.email,
      c.phone
    FROM trips t
    JOIN customers c ON c.id = t.customer_id
    ORDER BY t.updated_at DESC
  `;
  return Promise.all(
    rows.map((row) =>
      hydrate(sql, row, {
        id: row.customer_id,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
      }),
    ),
  );
}

export async function listTripsForTraveler(email: string, phone: string) {
  const sql = requireDb();
  const emailNormalized = normalizeEmail(email);
  if (!emailNormalized) return [];

  const rows = await sql<(TripRow & CustomerRow)[]>`
    SELECT
      t.*,
      c.full_name,
      c.email,
      c.phone
    FROM trips t
    JOIN customers c ON c.id = t.customer_id
    WHERE c.email_normalized = ${emailNormalized}
    ORDER BY t.updated_at DESC
  `;

  const matched = rows.filter((row) => phonesMatch(row.phone, phone));
  return Promise.all(
    matched.map((row) =>
      hydrate(sql, row, {
        id: row.customer_id,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
      }),
    ),
  );
}

export async function getTripById(id: string) {
  const sql = requireDb();
  const rows = await sql<(TripRow & CustomerRow)[]>`
    SELECT
      t.*,
      c.full_name,
      c.email,
      c.phone
    FROM trips t
    JOIN customers c ON c.id = t.customer_id
    WHERE t.id = ${id}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return undefined;
  return hydrate(sql, row, {
    id: row.customer_id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
  });
}

export async function createTrip(input: CreateRequestInput) {
  const sql = requireDb();
  return persistRequest(sql, applyCreate(input));
}

export async function updateTrip(id: string, body: UpdateRequestBody) {
  const existing = await getTripById(id);
  if (!existing) {
    throw new Error("Request not found.");
  }
  const sql = requireDb();
  let updated = await persistRequest(sql, applyUpdate(existing, body));
  if (body.quote) {
    updated = await attachQuotePdf(updated, body.quote.id || updated.quotes.at(-1)?.id || "");
  }
  return updated;
}

export async function addTripMessage(id: string, input: AddMessageInput) {
  const existing = await getTripById(id);
  if (!existing) {
    throw new Error("Request not found.");
  }
  const sql = requireDb();
  return persistRequest(sql, applyMessage(existing, input));
}
