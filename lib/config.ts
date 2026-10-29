// International format, digits only (no "+", spaces or leading 0) — used for wa.me links.
export const WHATSAPP_NUMBER = "212600000000";

export const INSTAGRAM_HANDLE = "ajitl3ab";
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

// Google Sheet "Publier sur le web" → CSV link for the Matchs tab.
// Leave empty to use the static list in data/matches.ts instead.
export const MATCHES_SHEET_CSV_URL = process.env.MATCHES_SHEET_CSV_URL ?? "";

/** Seconds between refreshes of the match lists on the live site. */
export const MATCHES_REVALIDATE_SECONDS = 300;

export const BRAND_NAME = "AJI TL3AB";
export const CITY = "Marrakech";

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
