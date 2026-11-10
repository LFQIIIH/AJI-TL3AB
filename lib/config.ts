// International format, digits only (no "+", spaces or leading 0) — used for wa.me links.
export const WHATSAPP_NUMBER = "212714610279";

export const INSTAGRAM_HANDLE = "ajitl3abfoot";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;

// Google Sheet "Publier sur le web" → CSV link for the Matchs tab.
// Set MATCHES_SHEET_CSV_URL="" to use the static list in data/matches.ts instead.
export const MATCHES_SHEET_CSV_URL =
  process.env.MATCHES_SHEET_CSV_URL ??
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZkjrqbPmxFFoESALgq4axdtTQ_pVVE_J7Q1nkgqnVmChWI39CztexYdQDBl0Cu9eZekkB_CnynSbS/pub?gid=753117502&single=true&output=csv";

// Same Google Sheet, "Training" tab published as CSV. If it's empty or can't
// be read, the site shows the default schedule in lib/training.ts.
export const TRAINING_SHEET_CSV_URL =
  process.env.TRAINING_SHEET_CSV_URL ??
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZkjrqbPmxFFoESALgq4axdtTQ_pVVE_J7Q1nkgqnVmChWI39CztexYdQDBl0Cu9eZekkB_CnynSbS/pub?gid=1996674253&single=true&output=csv";

// Same Google Sheet, "SwitchOff" tab published as CSV. Empty or unreadable =
// samedi et dimanche à 09:00 (lib/switchoff.ts).
export const SWITCHOFF_SHEET_CSV_URL =
  process.env.SWITCHOFF_SHEET_CSV_URL ??
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZkjrqbPmxFFoESALgq4axdtTQ_pVVE_J7Q1nkgqnVmChWI39CztexYdQDBl0Cu9eZekkB_CnynSbS/pub?gid=1214313567&single=true&output=csv";

/** Seconds between refreshes of the match lists on the live site. */
export const MATCHES_REVALIDATE_SECONDS = 300;

/** Production address (www). Used for canonical URLs, the sitemap and share previews. */
export const SITE_URL = "https://www.ajitl3ab.com";
export const SITE_HOST = new URL(SITE_URL).host;

/**
 * True for the production build. On Vercel, preview deployments have
 * VERCEL_ENV="preview" and are kept out of search engines (robots.txt +
 * noindex). Off Vercel (local `next build`), NODE_ENV decides.
 */
export const IS_PRODUCTION_SITE = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";

export const BRAND_NAME = "AJI TL3AB";
export const CITY = "Marrakech";

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
