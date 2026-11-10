import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFab from "@/components/WhatsAppFab";
import { SITE_URL } from "@/lib/config";
import { OG_IMAGE } from "@/lib/seo";
import "./globals.css";

const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AJI TL3AB — Matchs de foot à Marrakech",
    template: "%s · AJI TL3AB",
  },
  description:
    "Réserve ta place dans un match de foot 5v5, 7v7 ou 9v9 à Marrakech. Ghir aji w l3ab.",
  applicationName: "AJI TL3AB",
  // Defaults for pages without their own (pageMetadata() sets these per page).
  openGraph: { type: "website", locale: "fr_MA", siteName: "AJI TL3AB", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
  // Google Search Console "HTML tag" method: set GOOGLE_SITE_VERIFICATION in Vercel.
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#12372A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppFab />
      </body>
    </html>
  );
}
