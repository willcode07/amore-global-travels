import {
  installmentPlanLabel,
  paymentLabels,
  statusLabels,
  tripTypeLabels,
} from "@/lib/agents";
import { TravelRequest } from "@/lib/types";

function csvCell(value: string | number | undefined) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function requestsToCsv(requests: TravelRequest[]) {
  const header = [
    "Trip reference",
    "Created",
    "Updated",
    "Status",
    "Payment status",
    installmentPlanLabel,
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
    request.installmentPlanActive ? "Active" : "",
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
    installmentPlanLabel,
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
      request.installmentPlanActive ? "Active" : "",
      request.paymentStatus === "refunded"
        ? request.refundedAt ?? ""
        : request.paidAt ?? "",
      request.paymentNote,
      request.updatedAt,
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
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
