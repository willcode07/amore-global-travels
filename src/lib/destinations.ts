import { assetPath } from "@/lib/asset";

export const vacationRegions = [
  {
    slug: "caribbean",
    name: "Caribbean",
    eyebrow: "Sun, sea & celebration",
    summary:
      "Island getaways with the personal planning your group actually needs — Jamaica and across the Caribbean.",
    destinations: ["Jamaica", "Bahamas", "Barbados", "Turks & Caicos", "Belize"],
    image: assetPath("/images/caribbean.jpeg"),
  },
  {
    slug: "africa",
    name: "Africa",
    eyebrow: "Heritage & discovery",
    summary:
      "Group and family journeys to Ghana, Kenya, and beyond — planned with care, not a canned itinerary.",
    destinations: ["Ghana", "Kenya", "South Africa", "Tanzania"],
    image: assetPath("/images/about.jpeg"),
  },
  {
    slug: "europe",
    name: "Europe",
    eyebrow: "Cities, coasts & first trips",
    summary:
      "London, Paris, Rome, Greece — popular first-time destinations with an agent who stays with you.",
    destinations: ["London", "Paris", "Rome", "Greece", "Turkey"],
    image: assetPath("/images/travel-2.jpg"),
  },
] as const;

export const aura = {
  name: "Aura Frames",
  url: "https://www.auraframes.com/",
  headline: "Bring the trip home",
  summary:
    "An Aura digital frame keeps vacation photos moving — shared with everyone on the trip, without chasing a photo album. Amore can include a frame as an add-on when we quote your getaway.",
};
