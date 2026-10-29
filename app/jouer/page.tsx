import type { Metadata } from "next";
import { getUpcomingMatches } from "@/lib/matches";
import MatchBrowser from "./MatchBrowser";

export const metadata: Metadata = {
  title: "Jouer",
  description: "Tous les matchs 5v5, 7v7 et 9v9 à venir à Marrakech. Choisis, réserve, joue.",
};

// Re-render hourly so past matches drop off the list.
export const revalidate = 3600;

export default function JouerPage() {
  const matches = getUpcomingMatches();

  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Matchs à venir</p>
      <h1 className="headline mt-3 text-6xl sm:text-8xl">
        Fin <span className="text-accent">bghiti</span> tl3ab ?
      </h1>
      <p className="mt-4 max-w-xl text-chalk-muted">
        Filtre par jour et par format, choisis ton créneau et réserve en 30 secondes via WhatsApp.
      </p>
      <div className="mt-10">
        <MatchBrowser matches={matches} />
      </div>
    </div>
  );
}
