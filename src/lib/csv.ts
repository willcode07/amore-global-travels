import {
  paymentLabels,
  statusLabels,
  tripTypeLabels,
} from "@/lib/agents";
import { formatIntakeAddress, formatRequestParty } from "@/lib/intake";
import {
  paymentPlanTypeLabels,
  scheduleSummary,
} from "@/lib/payments";
import { TravelRequest } from "@/lib/types";

function csvCell(value: string | number | undefined) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function paymentPlanCell(request: TravelRequest) {
  const type = request.paymentPlanType ?? "none";
  if (type === "none" && !request.installmentPlanActive) return "";
  return paymentPlanTypeLabels[type];
}

function paymentDatesCell(request: TravelRequest) {
  const schedule = request.paymentSchedule ?? [];
  if (!schedule.length) return "";
  return schedule
    .map((item) => {
      const bits = [
        item.label || "Payment",
        item.dueDate || "",
        item.amount || "",
        item.status,
      ].filter(Boolean);
      return bits.join(" ");
    })
    .join("; ");
}

export function requestsToCsv(requests: TravelRequest[]) {
  const header = [
    "Trip reference",
    "Created",
    "Updated",
    "Status",
    "Payment status",
    "Payment plan type",
    "Payment schedule",
    "Payment schedule summary",
    "Payment date",
    "Payment note",
    "Traveler",
    "Email",
    "Phone",
    "Destination",
    "Trip type",
    "Travel window",
    "Travelers",
    "Budget",
    "Preferred agent",
    "Quotes",
    "Selected quote",
    "ClientEase ref",
  ];

  const rows = requests.map((request) => [
    request.tripRef,
    request.createdAt,
    request.updatedAt,
    statusLabels[request.status] ?? request.status,
    paymentLabels[request.paymentStatus] ?? request.paymentStatus,
    paymentPlanCell(request),
    paymentDatesCell(request),
    scheduleSummary(request),
    request.paymentStatus === "refunded"
      ? request.refundedAt ?? ""
      : request.paidAt ?? "",
    request.paymentNote,
    request.traveler.fullName,
    request.traveler.email,
    request.traveler.phone,
    request.trip.destination,
    tripTypeLabels[request.trip.tripType] ?? request.trip.tripType,
    request.trip.travelWindow,
    request.trip.travelers,
    request.trip.budget,
    request.trip.preferredAgent,
    request.quotes.length,
    request.quotes.find((quote) => quote.id === request.selectedQuoteId)
      ?.occasionTitle ?? "",
    request.clienteaseRef ?? "",
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

/** Confirmed bookings only — the ClientEase handoff file. */
export function confirmedTripsToCsv(requests: TravelRequest[]) {
  const confirmed = requests.filter((request) => request.status === "booking_confirmed");
  const header = [
    "Trip reference",
    "ClientEase ref",
    "Traveler",
    "Email",
    "Phone",
    "Destination",
    "Travel window",
    "Travelers",
    "Trip type",
    "Selected quote",
    "Quote total",
    "Payment status",
    "Payment plan type",
    "Payment schedule",
    "Payment schedule summary",
    "Payment date",
    "Payment note",
    "Confirmed at",
  ];
  const rows = confirmed.map((request) => {
    const quote =
      request.quotes.find((item) => item.id === request.selectedQuoteId) ??
      request.quotes[0];
    return [
      request.tripRef,
      request.clienteaseRef ?? "",
      request.traveler.fullName,
      request.traveler.email,
      request.traveler.phone,
      request.trip.destination,
      request.trip.travelWindow,
      request.trip.travelers,
      tripTypeLabels[request.trip.tripType] ?? request.trip.tripType,
      quote?.occasionTitle ?? "",
      quote?.investmentTotal ?? "",
      paymentLabels[request.paymentStatus] ?? request.paymentStatus,
      paymentPlanCell(request),
      paymentDatesCell(request),
      scheduleSummary(request),
      request.paymentStatus === "refunded"
        ? request.refundedAt ?? ""
        : request.paidAt ?? "",
      request.paymentNote,
      request.updatedAt,
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

/** One trip, ready to retype into ClientEase. Includes drafts that are not confirmed yet. */
export function clienteaseFileCsv(request: TravelRequest) {
  const quote =
    request.quotes.find((item) => item.id === request.selectedQuoteId) ??
    request.quotes[0];
  const rows: [string, string][] = [
    ["Trip reference", request.tripRef],
    ["ClientEase ref", request.clienteaseRef ?? ""],
    ["Traveler", request.traveler.fullName],
    ["Email", request.traveler.email],
    ["Phone", request.traveler.phone],
    ["Mailing address", request.intake ? formatIntakeAddress(request.intake) : ""],
    ["Departure city", request.trip.departureCity],
    ["Destination", request.trip.destination],
    ["Travel window", request.trip.travelWindow],
    ["Party", formatRequestParty(request)],
    ["Trip type", tripTypeLabels[request.trip.tripType] ?? request.trip.tripType],
    ["Selected quote", quote?.occasionTitle ?? ""],
    ["Quote total", quote?.investmentTotal ?? ""],
    ["Taxes and fees included", quote?.includesTaxesAndFees ? "Yes" : ""],
    ["Payment plan", paymentPlanCell(request)],
    ["Payment schedule", paymentDatesCell(request)],
    ["Notes", request.intake?.notes || request.trip.preferences],
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
