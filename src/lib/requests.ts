import { isApiBackend } from "@/lib/data";
import { notifyEvent } from "@/lib/email";
import { getRepository } from "@/lib/data";
import {
  AddMessageInput,
  CreateRequestInput,
  UpdateRequestBody,
} from "@/lib/request-ops";
import { writeSession } from "@/lib/session";

export type { CreateRequestInput, UpdateRequestBody } from "@/lib/request-ops";

export async function listRequests() {
  return getRepository().listAll();
}

export async function lookupTraveler(email: string, phone: string) {
  const matches = await getRepository().findByTraveler(email, phone);
  if (matches.length === 0) {
    throw new Error("No trips found for that email and phone number.");
  }
  return matches;
}

export async function createRequest(input: CreateRequestInput) {
  const travelRequest = await getRepository().create(input);
  if (input.persistSession !== false) {
    writeSession({
      fullName: travelRequest.traveler.fullName,
      email: travelRequest.traveler.email,
      phone: travelRequest.traveler.phone,
    });
  }
  if (!isApiBackend()) {
    notifyEvent("request_submitted", travelRequest);
  }
  return travelRequest;
}

export async function updateRequest(id: string, body: UpdateRequestBody) {
  const updated = await getRepository().update(id, body);
  const silent = Boolean(body.silent);

  if (!silent && !isApiBackend()) {
    if (body.status) {
      const event =
        updated.status === "options_ready" ? "options_ready" : "status_updated";
      notifyEvent(event, updated);
    }
    if (body.option || body.quote) {
      notifyEvent("options_ready", updated);
    }
    if (body.selectedOptionId || body.selectedQuoteId) {
      notifyEvent("option_selected", updated);
      notifyEvent("status_updated", updated);
    }
  }

  return updated;
}

export async function addMessage(id: string, input: AddMessageInput) {
  const updated = await getRepository().addMessage(id, input);
  if (!isApiBackend()) {
    notifyEvent(
      input.sender === "traveler" ? "message_from_traveler" : "message_from_agent",
      updated,
      { messagePreview: String(input.body ?? "").trim() },
    );
  }
  return updated;
}
