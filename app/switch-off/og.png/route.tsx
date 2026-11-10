import { renderOgImage, scheduleLabel } from "@/lib/og-image";
import { SWITCHOFF_CAPACITY, SWITCHOFF_PRICE_MAD, SWITCHOFF_TIME, SWITCHOFF_WEEKDAYS } from "@/lib/switchoff";
import { TRAINER_NAME } from "@/lib/training";

// Built once at deploy time (the content only changes with the code).
export const dynamic = "force-static";

export function GET() {
  return renderOgImage({
    eyebrow: `Switch Off · Week-end · Coach ${TRAINER_NAME.split(" ")[0]}`,
    title: "Sedd l'PC. *Jiii* l'terrain.",
    subtitle: "Samedi et dimanche à 9h : training, mini-matchs et défis, loin des écrans.",
    pills: [`${SWITCHOFF_PRICE_MAD} MAD`, `${SWITCHOFF_CAPACITY} places`, scheduleLabel(SWITCHOFF_WEEKDAYS, SWITCHOFF_TIME)],
  });
}
