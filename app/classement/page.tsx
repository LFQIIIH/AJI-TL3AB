import type { Metadata } from "next";
import DrawInfo from "@/components/community/DrawInfo";
import TeamOfMonth from "@/components/community/TeamOfMonth";
import Leaderboard from "./Leaderboard";
import { pageMetadata } from "@/lib/seo";
import { getDrawStatus, getDrawWinners, getMonthLeaderboard, getTeamOfMonth } from "@/lib/community-source";

export const metadata: Metadata = pageMetadata({
  title: "Classement des joueurs et tirage du mois",
  description:
    "Meilleurs buteurs, gardiens, défenseurs et milieux des matchs AJI TL3AB à Marrakech, équipe du mois et tirage au sort mensuel.",
  path: "/classement",
});

// Ranking, team of the month and draw are rendered on the server (refreshed
// every 5 min) and kept live in the browser.
export const revalidate = 300;

export default async function ClassementPage() {
  const [leaderboard, team, drawStatus, winners] = await Promise.all([
    getMonthLeaderboard(),
    getTeamOfMonth(),
    getDrawStatus(),
    getDrawWinners(6),
  ]);
  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Ranking</p>
      <h1 className="headline mt-3 text-6xl sm:text-8xl">
        Chkoun <span className="text-primary">l&apos;m3allem</span> ?
      </h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        Les buts sont comptés par l&apos;équipe après chaque match. Gardiens, défenseurs et milieux sont élus par les joueurs du match
        (vote ouvert 48 h). Seuls les matchs réservés avec un compte comptent.
      </p>

      <div className="mt-10">
        <Leaderboard initialMonth={leaderboard} />
      </div>

      <div className="mt-12">
        <TeamOfMonth initial={team} />
      </div>

      <section id="tirage" className="mt-12 scroll-mt-24">
        <DrawInfo initialStatus={drawStatus} initialWinners={winners} />
      </section>
    </div>
  );
}
