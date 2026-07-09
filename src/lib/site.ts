import { assetPath } from "@/lib/asset";

export const site = {
  name: "Amore Global",
  tagline: "Your one-stop-shop for worry-free cruise and vacation packages",
  email: "info@amoreglobaltravels.com",
  phone: "678-820-9739",
  phoneHref: "tel:6788209739",
  address: "Fayetteville, GA 30214",
};

export const navLinks = [
  { href: "/cruises", label: "Cruises" },
  { href: "/insurance", label: "Insurance" },
  { href: "/vacation-packages", label: "Vacation Packages" },
  { href: "/#about", label: "About Us" },
  { href: "/dashboard", label: "My Trip" },
  { href: "/contact-us", label: "Contact Us" },
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
