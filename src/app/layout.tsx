import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { RequestModalProvider } from "@/components/RequestModalProvider";
import { SiteFrame } from "@/components/SiteFrame";
import { site } from "@/lib/site";
import { themeBootstrapScript } from "@/lib/theme";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} Travels`,
    template: `%s | ${site.name}`,
  },
  description: site.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${figtree.variable} ${fraunces.variable} antialiased`}>
        <RequestModalProvider>
          <SiteFrame>{children}</SiteFrame>
        </RequestModalProvider>
      </body>
    </html>
  );
}
