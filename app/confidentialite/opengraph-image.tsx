import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "Politique de confidentialité d'AJI TL3AB";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: "Données personnelles",
    title: "*Confidentialité*",
    subtitle: "Ce qu'AJI TL3AB collecte quand tu réserves un match, pourquoi, et comment exercer tes droits.",
    pills: ["Loi 09-08"],
  });
}
