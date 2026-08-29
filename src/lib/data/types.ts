import {
  AddMessageInput,
  CreateRequestInput,
  UpdateRequestBody,
} from "@/lib/request-ops";
import { TravelRequest } from "@/lib/types";

export type TravelRepository = {
  listAll(): Promise<TravelRequest[]>;
  findByTraveler(email: string, phone: string): Promise<TravelRequest[]>;
  getById(id: string): Promise<TravelRequest | null>;
  create(input: CreateRequestInput): Promise<TravelRequest>;
  update(id: string, body: UpdateRequestBody): Promise<TravelRequest>;
  addMessage(id: string, input: AddMessageInput): Promise<TravelRequest>;
};
