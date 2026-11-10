import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFab from "@/components/WhatsAppFab";
import { IS_PRODUCTION_SITE, SITE_URL } from "@/lib/config";
import { fullTitle, PAGES } from "@/lib/seo";
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

const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const bing = process.env.BING_SITE_VERIFICATION?.trim();
const verification: Metadata["verification"] | undefined =
  IS_PRODUCTION_SITE && (google || bing)
    ? { ...(google ? { google } : {}), ...(bing ? { other: { "msvalidate.01": bing } } : {}) }
    : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: fullTitle(PAGES.home.title),
    template: "%s – AJI TL3AB",
  },
  description:
    "Réserve ta place dans un match de foot 5v5, 7v7 ou 9v9 à Marrakech. Ghir aji w l3ab.",
  applicationName: "AJI TL3AB",
  // Defaults for pages without their own (pageMetadata() sets these per page).
  openGraph: {
    type: "website",
    locale: "fr_MA",
    siteName: "AJI TL3AB",
    images: [{ url: "/og.png", width: 1200, height: 630, type: "image/png", alt: PAGES.home.imageAlt }],
  },
  twitter: { card: "summary_large_image", images: [{ url: "/og.png", alt: PAGES.home.imageAlt }] },
  // Preview deployments must never be indexed (production: no robots tag, i.e. index, follow).
  ...(IS_PRODUCTION_SITE ? {} : { robots: { index: false, follow: false } }),
  // Site-ownership meta tags, only when the token is set in Vercel (never hardcoded):
  // GOOGLE_SITE_VERIFICATION (Search Console "HTML tag") and BING_SITE_VERIFICATION
  // (Bing Webmaster Tools "meta tag", msvalidate.01). Production deployment only.
  ...(verification ? { verification } : {}),
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
