import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage, scheduleLabel } from "@/lib/og-image";
import { PRICE_PER_MONTH_MAD, PRICE_PER_SESSION_MAD, TRAINER_NAME, TRAINING_TIME, TRAINING_WEEKDAYS } from "@/lib/training";

export const alt = "Training physique en plein air à Marrakech avec AJI TL3AB";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: `Training physique · Coach ${TRAINER_NAME.split(" ")[0]}`,
    title: "Aji *tdreb*.",
    subtitle: "Gainage, cardio et renforcement en groupe, sur un terrain de foot à Marrakech.",
    pills: [`${PRICE_PER_SESSION_MAD} MAD / séance`, `${PRICE_PER_MONTH_MAD} MAD / mois`, scheduleLabel(TRAINING_WEEKDAYS, TRAINING_TIME)],
  });
}
