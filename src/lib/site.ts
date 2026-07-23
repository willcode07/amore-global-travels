import { assetPath } from "@/lib/asset";

export const site = {
  name: "Amore Global",
  tagline: "Your one-stop-shop for worry-free cruise and vacation packages",
  email: "info@amoreglobaltravels.com",
  phone: "404-500-7045",
  phoneHref: "tel:4045007045",
  address: "Fayetteville, GA 30214",
  stripePaymentLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "",
};

export type NavLink = {
  href: string;
  label: string;
  /** Opens the travel request / fillable form modal instead of navigating. */
  opensForm?: boolean;
};

export const navLinks: NavLink[] = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About Us" },
  { href: "/updates", label: "Updates & Advisories" },
  { href: "/contact-us", label: "Contact Us" },
  { href: "/fillable-form", label: "Fillable Form", opensForm: true },
  { href: "/connect-stripe", label: "Connect Stripe Account" },
];

export const services = [
  {
    href: "/cruises",
    title: "Cruises",
    description:
      "Sail away to adventure and relaxation with our unforgettable cruise packages.",
    image: assetPath("/images/travel-1.jpg"),
  },
  {
    href: "/vacation-packages",
    title: "Vacation Packages",
    description:
      "Escape to paradise with our unbeatable vacation packages.",
    image: assetPath("/images/caribbean.jpeg"),
  },
  {
    href: "/insurance",
    title: "Insurance",
    description:
      "Travel with peace of mind knowing you're protected with our comprehensive travel insurance.",
    image: assetPath("/images/about.jpeg"),
  },
];

export const advisories = [
  {
    title: "Covid in Africa",
    text: "Africa's resilience: battling COVID-19 with determination and solidarity.",
    image: assetPath("/images/about.jpeg"),
  },
  {
    title: "Winter Travel To The Caribbean",
    text: "Winter escape: Caribbean bliss beckons — sun, sand, and serenity await.",
    image: assetPath("/images/caribbean.jpeg"),
  },
  {
    title: "First Time Jet Guide",
    text: "Your essential first-time jet travel guide: navigating skies with confidence.",
    image: assetPath("/images/travel-1.jpg"),
  },
];
