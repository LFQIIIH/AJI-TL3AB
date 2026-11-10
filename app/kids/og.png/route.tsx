import { renderOgImage } from "@/lib/og-image";

// Built once at deploy time (the content only changes with the code).
export const dynamic = "force-static";

export function GET() {
  return renderOgImage({
    eyebrow: "Enfants · 5 à 14 ans",
    title: "Sghar f l'3mer, *kbar* f terrain.",
    subtitle: "Matchs, jeux et défis encadrés pour les enfants, par tranche d'âge.",
    pills: ["5–14 ans", "Encadrés", "Sur WhatsApp"],
  });
}
