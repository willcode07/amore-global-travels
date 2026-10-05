"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const holding = path === "/coming-soon" || path === "/coming-soon/";

  if (holding) return children;

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
