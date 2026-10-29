// International format, digits only (no "+", spaces or leading 0) — used for wa.me links.
export const WHATSAPP_NUMBER = "212600000000";

export const INSTAGRAM_HANDLE = "ajitl3ab";
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

export const BRAND_NAME = "AJI TL3AB";
export const CITY = "Marrakech";

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
