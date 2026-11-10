import { renderOgImage } from "@/lib/og-image";

// Built once at deploy time (the content only changes with the code).
export const dynamic = "force-static";

export function GET() {
  return renderOgImage({
    eyebrow: "Classement · Marrakech",
    title: "Chkoun *l'm3allem* ?",
    subtitle: "Meilleurs buteurs, gardiens, défenseurs et milieux, l'équipe du mois et un match gratuit à gagner.",
    pills: ["Buteurs", "Votes", "Tirage du mois"],
  });
}
