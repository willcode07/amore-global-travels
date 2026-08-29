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
  { href: "/request-a-quote", label: "Request a Quote", opensForm: true, emphasize: true },
];

export const services = [
  {
    href: "/cruises",
    title: "Cruises",
    description:
      "Group sailings and private cruise planning — an agent builds the itinerary with you.",
    image: assetPath("/images/travel-1.jpg"),
  },
  {
    href: "/vacation-packages",
    title: "Vacation Packages",
    description:
      "Africa, the Caribbean, and Europe — generalized inspiration, then a custom quote.",
    image: assetPath("/images/caribbean.jpeg"),
  },
  {
    href: "/insurance",
    title: "Travel Insurance",
    description:
      "Trip protection we can include in your quote so the unexpected does not become unpaid.",
    image: assetPath("/images/about.jpeg"),
  },
];

export const advisories = [
  {
    title: "Planning travel to Africa",
    text: "Entry rules and health guidance change. We confirm the current picture before you book — not after.",
    image: assetPath("/images/about.jpeg"),
  },
  {
    title: "Caribbean peak season",
    text: "Winter sun fills up. Share your window early and we will hold the right room mix for your group.",
    image: assetPath("/images/caribbean.jpeg"),
  },
  {
    title: "First-time flyers",
    text: "Documents, connections, and what to pack: we walk first-time travelers through the details.",
    image: assetPath("/images/travel-1.jpg"),
  },
];
