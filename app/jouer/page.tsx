import type { Metadata } from "next";
import { getUpcomingMatches } from "@/lib/matches-source";
import InfoStrip from "@/components/InfoStrip";
import MatchBrowser from "./MatchBrowser";

export const metadata: Metadata = {
  title: "Jouer",
  description: "Tous les matchs 5v5, 7v7 et 9v9 à venir à Marrakech. Choisis, réserve, joue.",
};

// Re-render every 5 min (MATCHES_REVALIDATE_SECONDS) to pick up sheet edits
// and drop matches that have started.
export const revalidate = 300;

export default async function JouerPage() {
  const matches = await getUpcomingMatches();

  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Matchs à venir</p>
      <h1 className="headline mt-3 text-6xl sm:text-8xl">
        Fin <span className="text-primary">bghiti</span> tl3ab ?
      </h1>
      <p className="mt-4 max-w-xl text-ink-muted">
        Filtre par jour et par format, choisis ton créneau et réserve en 30 secondes via WhatsApp.
      </p>
      <InfoStrip
        className="mt-8"
        items={[
          { icon: "cash", label: "Paiement", value: "Sur place, espèces ou virement" },
          { icon: "clock", label: "Arrivée", value: "10 min avant le coup d'envoi" },
          { icon: "ball", label: "Fourni", value: "Ballon, chasubles, équipes" },
          { icon: "calendar", label: "Annulation", value: "Gratuite jusqu'à 24h avant" },
        ]}
      />
      <div className="mt-10">
        <MatchBrowser matches={matches} />
      </div>
    </div>
  );
}
