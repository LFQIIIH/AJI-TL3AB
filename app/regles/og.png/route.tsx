import { renderOgImage } from "@/lib/og-image";
import { FULL_REFUND_HOURS } from "@/lib/rules";

// Built once at deploy time (the content only changes with the code).
export const dynamic = "force-static";

export function GET() {
  return renderOgImage({
    eyebrow: "Règlement · AJI TL3AB",
    title: "Les *règles* du jeu",
    subtitle: "Réserver, payer, annuler, arriver à l'heure et jouer fair-play.",
    pills: [`100 % remboursé jusqu'à ${FULL_REFUND_HOURS} h avant`, "Fair-play"],
  });
}
