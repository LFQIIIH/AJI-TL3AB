import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "Foot pour enfants de 5 à 14 ans à Marrakech avec AJI TL3AB";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: "Enfants · 5 à 14 ans",
    title: "Sghar f l'3mer, *kbar* f terrain.",
    subtitle: "Matchs, jeux et défis encadrés pour les enfants, par tranche d'âge.",
    pills: ["5–14 ans", "Encadrés", "Sur WhatsApp"],
  });
}
