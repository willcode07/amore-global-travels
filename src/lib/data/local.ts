import {
  AddMessageInput,
  CreateRequestInput,
  UpdateRequestBody,
  applyCreate,
  applyMessage,
  applyUpdate,
} from "@/lib/request-ops";
import {
  findRequestsForTraveler,
  getRequestById,
  readRequests,
  upsertRequest,
} from "@/lib/store";
import { TravelRepository } from "@/lib/data/types";

export const localRepository: TravelRepository = {
  async listAll() {
    return readRequests();
  },

  async findByTraveler(email, phone) {
    return findRequestsForTraveler(email, phone);
  },

  async getById(id) {
    return getRequestById(id);
  },

  async create(input: CreateRequestInput) {
    return upsertRequest(applyCreate(input));
  },

  async update(id: string, body: UpdateRequestBody) {
    const existing = getRequestById(id);
    if (!existing) {
      throw new Error("Request not found.");
    }
    return upsertRequest(applyUpdate(existing, body));
  },

  async addMessage(id: string, input: AddMessageInput) {
    const existing = getRequestById(id);
    if (!existing) {
      throw new Error("Request not found.");
    }
    return upsertRequest(applyMessage(existing, input));
  },
};
