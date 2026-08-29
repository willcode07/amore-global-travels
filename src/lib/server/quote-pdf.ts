import { jsPDF } from "jspdf";
import { TravelProposal, TravelRequest } from "@/lib/types";

export function buildQuotePdf(request: TravelRequest, quote: TravelProposal) {
  const doc = new jsPDF();
  let y = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Amore Global Travels", 20, y);
  y += 8;
  doc.setFontSize(12);
  doc.text(quote.occasionTitle || "Travel quote", 20, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const lines = [
    `Trip reference: ${request.tripRef}`,
    `Traveler: ${request.traveler.fullName}`,
    `Destination: ${quote.destinationLabel || request.trip.destination}`,
    `Dates: ${quote.dates}`,
    `Nights: ${quote.nights}`,
    `Travelers: ${quote.travelersLabel}`,
    `Stay: ${quote.resortName}`,
    `Room: ${quote.roomType}`,
    `Investment total: ${quote.investmentTotal}`,
    quote.includeFlights ? `Flights: ${quote.flightRoute}` : "",
    quote.includeProtection ? `Protection: ${quote.protectionProvider}` : "",
  ].filter(Boolean);

  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 20, y);
    y += 7;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Notes", 20, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  for (const note of quote.notes.filter(Boolean)) {
    const wrapped = doc.splitTextToSize(note, 170);
    doc.text(wrapped, 20, y);
    y += wrapped.length * 6 + 2;
  }

  return Buffer.from(doc.output("arraybuffer"));
}
