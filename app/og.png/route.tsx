import { renderOgImage } from "@/lib/og-image";

// Default share image for the site (and the home page).

// Built once at deploy time (the content only changes with the code).
export const dynamic = "force-static";

export function GET() {
  return renderOgImage({
    eyebrow: "Football · Marrakech",
    title: "Aji *tl3ab*.",
    subtitle: "Matchs de foot 5v5, 7v7 et 9v9. Seul ou entre amis, réserve ta place, on s'occupe du terrain et des équipes.",
    pills: ["5v5 · 7v7 · 9v9", "Réservation en 30 s"],
  });
}
