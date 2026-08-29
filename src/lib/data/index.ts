import { apiRepository } from "@/lib/data/api";
import { localRepository } from "@/lib/data/local";
import { isApiBackend } from "@/lib/data/mode";
import { TravelRepository } from "@/lib/data/types";

export { isApiBackend } from "@/lib/data/mode";

export function getRepository(): TravelRepository {
  return isApiBackend() ? apiRepository : localRepository;
}
