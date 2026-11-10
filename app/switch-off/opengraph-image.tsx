import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage, scheduleLabel } from "@/lib/og-image";
import { SWITCHOFF_CAPACITY, SWITCHOFF_PRICE_MAD, SWITCHOFF_TIME, SWITCHOFF_WEEKDAYS } from "@/lib/switchoff";
import { TRAINER_NAME } from "@/lib/training";

export const alt = "Switch Off : sport le week-end à Marrakech avec AJI TL3AB";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: `Switch Off · Week-end · Coach ${TRAINER_NAME.split(" ")[0]}`,
    title: "Sedd l'PC. *Jiii* l'terrain.",
    subtitle: "Samedi et dimanche à 9h : training, mini-matchs et défis, loin des écrans.",
    pills: [`${SWITCHOFF_PRICE_MAD} MAD`, `${SWITCHOFF_CAPACITY} places`, scheduleLabel(SWITCHOFF_WEEKDAYS, SWITCHOFF_TIME)],
  });
}
