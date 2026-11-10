import type { Metadata } from "next";
import { getUpcomingMatches } from "@/lib/matches-source";
import InfoStrip from "@/components/InfoStrip";
import MatchBrowser from "./MatchBrowser";
import { jouerDescription, pageMetadata } from "@/lib/seo";
import PageSeo from "@/components/PageSeo";
import { matchesSchema } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  // Description built from the upcoming matches (count, lowest price, formats).
  return pageMetadata("jouer", { description: jouerDescription(await getUpcomingMatches()) });
}

// Re-render every 5 min (MATCHES_REVALIDATE_SECONDS) to pick up sheet edits
// and drop matches that have started.
export const revalidate = 300;

export default async function JouerPage() {
  const matches = await getUpcomingMatches();

  return (
    <div className="container-page py-12 sm:py-16">
      <PageSeo page="jouer" schema={matchesSchema(matches)} />
      <h1 className="eyebrow">Matchs de foot à venir à Marrakech</h1>
      <p className="headline mt-3 text-6xl sm:text-8xl">
        Fin <span className="text-primary">bghiti</span> tl3ab ?
      </p>
      <p className="mt-4 max-w-xl text-ink-muted">
        Filtre par jour et par format, choisis ton créneau et réserve en 30 secondes via WhatsApp.
      </p>
      <InfoStrip
        className="mt-8"
        items={[
          { icon: "cash", label: "Paiement", value: "Sur place, espèces ou virement" },
          { icon: "clock", label: "Arrivée", value: "10 min avant le coup d'envoi" },
          { icon: "ball", label: "Fourni", value: "Ballon, chasubles, équipes" },
          { icon: "store", label: "Pas de chaussures ?", value: "Location 20 MAD, à réserver avec ta place" },
          { icon: "calendar", label: "Annulation", value: "Gratuite jusqu'à 24h avant" },
        ]}
      />
      <div className="mt-10">
        <MatchBrowser matches={matches} />
      </div>
    </div>
  );
}
