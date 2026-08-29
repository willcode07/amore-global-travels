import { localRepository } from "@/lib/data/local";
import { TravelRepository } from "@/lib/data/types";

export { isApiBackend } from "@/lib/data/mode";

export function getRepository(): TravelRepository {
  return localRepository;
}
