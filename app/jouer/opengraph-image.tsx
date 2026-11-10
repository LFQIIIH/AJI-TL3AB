import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";
import { formatDay, formatTime } from "@/lib/matches";
import { getUpcomingMatches } from "@/lib/matches-source";

// Built from the upcoming matches (next match, count, price), refreshed with the page.
export const revalidate = 300;
export const alt = "Matchs de foot à venir à Marrakech avec AJI TL3AB";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const matches = await getUpcomingMatches().catch(() => []);
  const next = matches[0];
  if (!next) {
    return renderOgImage({
      eyebrow: "Matchs à Marrakech",
      title: "Fin *bghiti* tl3ab ?",
      subtitle: "Matchs de foot 5v5, 7v7 et 9v9 par jour, quartier et niveau. Réserve ta place en 30 secondes.",
      pills: ["5v5 · 7v7 · 9v9", "Seul ou entre amis"],
    });
  }
  const minPrice = Math.min(...matches.map((m) => m.priceMad));
  return renderOgImage({
    eyebrow: `${matches.length} ${matches.length > 1 ? "matchs" : "match"} à venir à Marrakech`,
    title: "Fin *bghiti* tl3ab ?",
    subtitle: `Prochain match : ${next.format} ${formatDay(next.date)} à ${formatTime(next.time)}, ${[next.pitch, next.area].filter(Boolean).join(", ")}.`,
    pills: [next.format, `${formatDay(next.date)} · ${formatTime(next.time)}`, `Dès ${minPrice} MAD`],
  });
}
