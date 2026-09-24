import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { RequestModalProvider } from "@/components/RequestModalProvider";
import { assetPath } from "@/lib/asset";
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
        <link rel="icon" href={assetPath("/favicon.ico")} sizes="any" />
        <link rel="icon" href={assetPath("/favicon-32.png")} type="image/png" sizes="32x32" />
        <link rel="icon" href={assetPath("/favicon.svg")} type="image/svg+xml" />
        <link rel="apple-touch-icon" href={assetPath("/apple-touch-icon.png")} />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${figtree.variable} ${fraunces.variable} antialiased`}>
        <RequestModalProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </RequestModalProvider>
      </body>
    </html>
  );
}
