import type { Metadata } from "next";
import { BRAND_NAME, SITE_URL } from "@/lib/config";

/** Branded share image (public/og-image.png, 1200×630). */
export const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: "AJI TL3AB · Matchs de foot à Marrakech" };

/**
 * Metadata for an indexable page: title, description, canonical URL and the
 * Open Graph / Twitter tags used by WhatsApp, Instagram, Facebook and Google.
 * `title` goes through the layout template ("… · AJI TL3AB") unless `absoluteTitle`.
 */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
}): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${BRAND_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "fr_MA",
      siteName: BRAND_NAME,
      url: path,
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [OG_IMAGE.url] },
  };
}

/** Absolute URL for structured data. */
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();
