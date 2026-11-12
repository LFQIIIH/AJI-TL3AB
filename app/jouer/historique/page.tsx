import type { Metadata } from "next";
import JouerTabs from "@/components/JouerTabs";
import PageSeo from "@/components/PageSeo";
import RelatedLinks from "@/components/RelatedLinks";
import { getMatchPlayers, getRecentResults } from "@/lib/matches-source";
import { pageMetadata } from "@/lib/seo";
import PastMatches from "./PastMatches";

export const metadata: Metadata = pageMetadata("historique");

// Refreshed with the match list (scores are entered in /admin).
export const revalidate = 300;

export default async function HistoryPage() {
  const results = await getRecentResults();
  const players = await getMatchPlayers(results.map((m) => m.id));
  return (
    <div className="container-page py-12 sm:py-16">
      <PageSeo page="historique" />
      <h1 className="eyebrow">Résultats des matchs de foot à Marrakech</h1>
      <p className="headline mt-3 text-6xl sm:text-8xl">
        Chkoun <span className="text-primary">rbe7</span> ?
      </p>
      <p className="mt-4 max-w-xl text-ink-muted">Les scores des derniers matchs, les joueurs élus par leurs coéquipiers, et qui était là.</p>
      <JouerTabs current="/jouer/historique" className="mt-6" />
      <div className="mt-8">
        <PastMatches results={results} players={players} />
      </div>
      <RelatedLinks page="historique" className="mt-16 border-t border-line pt-12" />
    </div>
  );
}
