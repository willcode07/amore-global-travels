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

export const featuredDestinations = [
  ...new Set(vacationRegions.flatMap((region) => [region.name, ...region.destinations])),
  "Mediterranean",
  "Alaska",
  "Hawaii",
  "Mexico",
  "Dubai",
];

export const commonDepartureCities = [
  "Atlanta, GA",
  "Miami, FL",
  "Charlotte, NC",
  "New York, NY",
  "Newark, NJ",
  "Washington, DC",
  "Orlando, FL",
  "Tampa, FL",
  "Dallas, TX",
  "Houston, TX",
  "Chicago, IL",
  "Los Angeles, CA",
  "Fort Lauderdale, FL",
];

export const aura = {
  name: "Aura Frames",
  url: "https://www.auraframes.com/",
  headline: "Bring the trip home",
  summary:
    "An Aura digital frame keeps vacation photos moving — shared with everyone on the trip, without chasing a photo album. Amore can include a frame as an add-on when we quote your getaway.",
};

export const cruisePackages = [
  {
    slug: "caribbean-cruise",
    name: "Caribbean cruise",
    eyebrow: "Group & private sailings",
    summary:
      "Island hops from Miami and beyond — an agent matches ship, dates, and cabin to your group.",
    destination: "Caribbean cruise",
    image: assetPath("/images/travel-1.jpg"),
  },
  {
    slug: "mediterranean-cruise",
    name: "Mediterranean cruise",
    eyebrow: "Ports with a plan",
    summary:
      "Italy, Greece, and the coast in between. A real itinerary, not a mystery yacht picker.",
    destination: "Mediterranean cruise",
    image: assetPath("/images/travel-2.jpg"),
  },
  {
    slug: "alaska-cruise",
    name: "Alaska cruise",
    eyebrow: "Glaciers & long days",
    summary:
      "A cooler-weather sailing with the same Amore follow-through — quote first, book when you are sure.",
    destination: "Alaska cruise",
    image: assetPath("/images/about.jpeg"),
  },
] as const;
