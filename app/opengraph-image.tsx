import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

// Default share image for the site (and the home page).
export const alt = "AJI TL3AB : matchs de foot 5v5, 7v7 et 9v9 à Marrakech";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: "Football · Marrakech",
    title: "Aji *tl3ab*.",
    subtitle: "Matchs de foot 5v5, 7v7 et 9v9. Seul ou entre amis, réserve ta place, on s'occupe du terrain et des équipes.",
    pills: ["5v5 · 7v7 · 9v9", "Réservation en 30 s"],
  });
}
