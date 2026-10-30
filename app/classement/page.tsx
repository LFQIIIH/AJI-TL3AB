import type { Metadata } from "next";
import DrawInfo from "@/components/community/DrawInfo";
import TeamOfMonth from "@/components/community/TeamOfMonth";
import Leaderboard from "./Leaderboard";

export const metadata: Metadata = {
  title: "Ranking",
  description: "Meilleurs buteurs, gardiens, défenseurs et milieux AJI TL3AB, équipe du mois et tirage au sort mensuel.",
};

export default function ClassementPage() {
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
        <Leaderboard />
      </div>

      <div className="mt-12">
        <TeamOfMonth />
      </div>

      <section id="tirage" className="mt-12 scroll-mt-24">
        <DrawInfo />
      </section>
    </div>
  );
}
