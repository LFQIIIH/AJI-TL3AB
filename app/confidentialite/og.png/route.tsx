import { renderOgImage } from "@/lib/og-image";

// Built once at deploy time (the content only changes with the code).
export const dynamic = "force-static";

export function GET() {
  return renderOgImage({
    eyebrow: "Données personnelles",
    title: "*Confidentialité*",
    subtitle: "Ce qu'AJI TL3AB collecte quand tu réserves un match, pourquoi, et comment exercer tes droits.",
    pills: ["Loi 09-08"],
  });
}
