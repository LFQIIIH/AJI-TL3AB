import { renderOgImage } from "@/lib/og-image";
import { getRecentResults } from "@/lib/matches-source";

export const revalidate = 300;

export async function GET() {
  const last = (await getRecentResults(1).catch(() => []))[0];
  return renderOgImage({
    eyebrow: "Historique · Marrakech",
    title: "Chkoun *rbe7* ?",
    subtitle: last?.result
      ? `Dernier match : ${last.result.home.name} ${last.result.home.score} – ${last.result.away.score} ${last.result.away.name}, ${last.pitch}.`
      : "Les scores et les joueurs élus des derniers matchs AJI TL3AB.",
    pills: ["Scores", "MVP", "Recherche par joueur"],
  });
}
