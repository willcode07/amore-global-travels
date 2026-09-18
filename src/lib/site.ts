import { assetPath } from "@/lib/asset";
import { brand } from "@/lib/brand";

export const site = {
  name: brand.name,
  tagline: "Your one-stop-shop for worry-free cruise and vacation packages",
  email: brand.contact.email,
  phone: brand.contact.phone,
  phoneHref: brand.contact.phoneHref,
  address: brand.contact.address,
};

export type NavLink = {
  href: string;
  label: string;
  /** Opens the travel request modal instead of navigating. */
  opensForm?: boolean;
  emphasize?: boolean;
};

export const navLinks: NavLink[] = [
  { href: "/services", label: "Services" },
  { href: "/vacation-packages", label: "Vacations" },
  { href: "/cruises", label: "Cruises" },
  { href: "/about", label: "About Us" },
  { href: "/contact-us", label: "Contact" },
  { href: "/", label: "Request a Quote", opensForm: true, emphasize: true },
];

export const services = [
  {
    href: "/insurance",
    title: "Travel Insurance",
    description:
      "Allianz trip protection we can include on your quote so the unexpected does not become unpaid.",
    image: assetPath("/images/about.jpeg"),
  },
  {
    href: "/enhance-your-trip",
    title: "Bring the trip home",
    description:
      "An Aura digital frame keeps vacation photos moving for everyone on the trip — we can add it to your quote.",
    image: assetPath("/images/travel-2.jpg"),
  },
];

export const travelAdvisoryUrl =
  "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html";

export const advisories = [
  {
    title: "Planning travel to Africa",
    text: "Entry rules and health guidance change. We confirm the current picture before you book — not after.",
    image: assetPath("/images/about.jpeg"),
    href: travelAdvisoryUrl,
  },
  {
    title: "Caribbean peak season",
    text: "Winter sun fills up. Share your window early and we will hold the right room mix for your group.",
    image: assetPath("/images/caribbean.jpeg"),
    href: travelAdvisoryUrl,
  },
  {
    title: "First-time flyers",
    text: "Documents, connections, and what to pack: we walk first-time travelers through the details.",
    image: assetPath("/images/travel-1.jpg"),
  },
];
