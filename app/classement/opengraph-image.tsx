import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "Classement des joueurs AJI TL3AB et tirage au sort du mois";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: "Classement · Marrakech",
    title: "Chkoun *l'm3allem* ?",
    subtitle: "Meilleurs buteurs, gardiens, défenseurs et milieux, l'équipe du mois et un match gratuit à gagner.",
    pills: ["Buteurs", "Votes", "Tirage du mois"],
  });
}
