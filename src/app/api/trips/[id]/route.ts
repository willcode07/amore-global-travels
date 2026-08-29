import { NextRequest, NextResponse } from "next/server";
import { UpdateRequestBody } from "@/lib/request-ops";
import { canAccessTrip, isAgentAuthorized } from "@/lib/server/auth";
import { DatabaseNotConfiguredError, noDatabaseJson } from "@/lib/server/db";
import { notifyFromUpdate } from "@/lib/server/notify";
import { getTripById, updateTrip } from "@/lib/server/trips";
import { PaymentStatus, RequestStatus, TravelProposal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function handleError(err: unknown) {
  if (err instanceof DatabaseNotConfiguredError) {
    return NextResponse.json(noDatabaseJson(), { status: 503 });
  }
  const message = err instanceof Error ? err.message : "Unexpected error.";
  const status = message === "Request not found." ? 404 : 500;
  return NextResponse.json({ error: message }, { status });
}

const statuses: RequestStatus[] = [
  "submitted",
  "under_review",
  "options_ready",
  "option_selected",
  "booking_confirmed",
];

const payments: PaymentStatus[] = [
  "not_requested",
  "deposit_due",
  "paid",
  "refunded",
];

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const trip = await getTripById(id);
    if (!trip) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    if (!canAccessTrip(request, trip)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    return NextResponse.json({ trip });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const raw = (await request.json()) as Record<string, unknown>;
    const body: UpdateRequestBody = {};

    if (typeof raw.status === "string" && statuses.includes(raw.status as RequestStatus)) {
      body.status = raw.status as RequestStatus;
    }
    if (
      typeof raw.paymentStatus === "string" &&
      payments.includes(raw.paymentStatus as PaymentStatus)
    ) {
      body.paymentStatus = raw.paymentStatus as PaymentStatus;
    }
    if (typeof raw.paymentNote === "string") {
      body.paymentNote = raw.paymentNote;
    }
    if (raw.clienteaseRef === null || typeof raw.clienteaseRef === "string") {
      body.clienteaseRef = raw.clienteaseRef as string | null;
    }
    if (raw.option && typeof raw.option === "object") {
      const option = raw.option as Record<string, unknown>;
      body.option = {
        title: typeof option.title === "string" ? option.title : undefined,
        summary: typeof option.summary === "string" ? option.summary : undefined,
        estimatedPrice:
          typeof option.estimatedPrice === "string" ? option.estimatedPrice : undefined,
        highlights:
          Array.isArray(option.highlights) || typeof option.highlights === "string"
            ? (option.highlights as string | string[])
            : undefined,
        flyerUrl: typeof option.flyerUrl === "string" ? option.flyerUrl : undefined,
      };
    }
    if (raw.quote && typeof raw.quote === "object") {
      body.quote = raw.quote as TravelProposal;
    }
    if (typeof raw.selectedOptionId === "string") {
      body.selectedOptionId = raw.selectedOptionId;
    }
    if (typeof raw.selectedQuoteId === "string") {
      body.selectedQuoteId = raw.selectedQuoteId;
    }
    if (typeof raw.silent === "boolean") {
      body.silent = raw.silent;
    }

    const existing = await getTripById(id);
    if (!existing) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    if (!canAccessTrip(request, existing)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    if (!isAgentAuthorized(request)) {
      const travelerAllowed =
        Boolean(body.selectedQuoteId) || Boolean(body.selectedOptionId);
      if (!travelerAllowed) {
        return NextResponse.json({ error: "Not allowed." }, { status: 403 });
      }
    }

    const trip = await updateTrip(id, body);
    await notifyFromUpdate(existing, trip, body);
    return NextResponse.json({ trip });
  } catch (err) {
    return handleError(err);
  }
}
