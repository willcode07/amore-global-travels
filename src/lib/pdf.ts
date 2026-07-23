"use client";

import { jsPDF } from "jspdf";
import { site } from "@/lib/site";

export type ContactFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  message: string;
};

export type QuoteFormData = {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  preferredContactMethods: string[];
  destination: string;
  transportationModes: string[];
  departureDate: string;
  returnDate: string;
  preferences: string;
  accessibilityNeeded: string;
  accessibilityNotes: string;
  adultsCount: string;
  adultsAges: string;
  childrenCount: string;
  childrenAges: string;
  pets: boolean;
  supportAnimal: boolean;
  preferredAgent: string;
};

function addWrappedText(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  margin: number,
  maxWidth: number,
): number {
  const text = value?.trim() ? value : "—";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(label, margin, y);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, margin + 55, y);
  return y + Math.max(lines.length, 1) * 5 + 3;
}

function ensureSpace(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed < 280) return y;
  doc.addPage();
  return 20;
}

function header(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(site.name, 20, 20);
  doc.setFontSize(12);
  doc.text(title, 20, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Routed to: ${site.email}`, 20, 35);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 41);
  doc.text(
    "Note: Preferred agent can be forwarded via inbox rules / shared inbox assignment.",
    20,
    47,
  );
  doc.line(20, 51, 190, 51);
}

export function downloadContactPdf(data: ContactFormData): string {
  const doc = new jsPDF();
  header(doc, "Contact Us Inquiry");
  let y = 60;
  const rows: [string, string][] = [
    ["First name", data.firstName],
    ["Last name", data.lastName],
    ["Phone", data.phone],
    ["Email", data.email],
    ["Questions", data.message],
  ];
  for (const [label, value] of rows) {
    y = ensureSpace(doc, y);
    y = addWrappedText(doc, label, value, y, 20, 115);
  }
  const filename = `amore-contact-${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}

export function downloadQuotePdf(data: QuoteFormData): string {
  const doc = new jsPDF();
  header(doc, "Request a Quote");
  let y = 60;
  const rows: [string, string][] = [
    ["First name", data.firstName],
    ["Last name", data.lastName],
    ["Address 1", data.address1],
    ["Address 2", data.address2],
    ["City", data.city],
    ["State", data.state],
    ["ZIP", data.zip],
    ["Phone", data.phone],
    ["Email", data.email],
    ["Preferred contact", data.preferredContactMethods.join(", ")],
    ["Destination", data.destination],
    ["Transportation", data.transportationModes.join(", ")],
    ["Departure date", data.departureDate],
    ["Return date", data.returnDate],
    ["Travel preferences", data.preferences],
    ["Accessibility needed", data.accessibilityNeeded || "—"],
    ["Accessibility notes", data.accessibilityNotes],
    ["Adults", `${data.adultsCount}; ages: ${data.adultsAges || "—"}`],
    ["Children", `${data.childrenCount}; ages: ${data.childrenAges || "—"}`],
    ["Pets", data.pets ? "Yes" : "No"],
    ["Support animal", data.supportAnimal ? "Yes" : "No"],
    ["Travel agent", data.preferredAgent || "—"],
  ];
  for (const [label, value] of rows) {
    y = ensureSpace(doc, y);
    y = addWrappedText(doc, label, value, y, 20, 115);
  }
  const filename = `amore-quote-${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}

export function openMailtoWithBody(subject: string, body: string) {
  const href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

export function contactMailtoBody(data: ContactFormData): string {
  return [
    `New Contact Us inquiry for ${site.name}`,
    "",
    "Attach the downloaded PDF when sending.",
    "",
    `First Name: ${data.firstName}`,
    `Last Name: ${data.lastName}`,
    `Phone: ${data.phone}`,
    `Email: ${data.email}`,
    "",
    "Questions:",
    data.message,
  ].join("\n");
}

export function quoteMailtoBody(data: QuoteFormData): string {
  return [
    `New Request a Quote for ${site.name}`,
    "",
    "Attach the downloaded PDF when sending.",
    data.preferredAgent
      ? `Selected agent (forward/assign): ${data.preferredAgent}`
      : "No specific agent selected.",
    "",
    `First Name: ${data.firstName}`,
    `Last Name: ${data.lastName}`,
    `Address1: ${data.address1}`,
    `Address2: ${data.address2}`,
    `City: ${data.city}`,
    `State: ${data.state}`,
    `Zip: ${data.zip}`,
    `Phone: ${data.phone}`,
    `Email: ${data.email}`,
    `Preferred Contact: ${data.preferredContactMethods.join(", ") || "—"}`,
    `Destination: ${data.destination}`,
    `Transportation: ${data.transportationModes.join(", ") || "—"}`,
    `Departure: ${data.departureDate}`,
    `Return: ${data.returnDate}`,
    `Preferences: ${data.preferences || "—"}`,
    `Accessibility: ${data.accessibilityNeeded || "—"}`,
    `Accessibility notes: ${data.accessibilityNotes || "—"}`,
    `Adults: ${data.adultsCount}; Ages: ${data.adultsAges || "—"}`,
    `Children: ${data.childrenCount}; Ages: ${data.childrenAges || "—"}`,
    `Pets: ${data.pets ? "Yes" : "No"}`,
    `Support Animal: ${data.supportAnimal ? "Yes" : "No"}`,
    `Travel Agent: ${data.preferredAgent || "—"}`,
  ].join("\n");
}
