"use client";

import Link from "next/link";
import type { Match } from "@/data/matches";
import MatchCard from "@/components/MatchCard";
import { isFull } from "@/lib/matches";
import { useMatchCounts, withOnlineBookings } from "@/lib/useMatchCounts";

/** Next matches on the home page, counting online bookings. */
export default function UpcomingCards({ matches }: { matches: Match[] }) {
  const { counts } = useMatchCounts(matches.map((m) => m.id));
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-3">
      {matches.map((raw) => {
        const m = withOnlineBookings(raw, counts);
        return (
          <MatchCard
            key={m.id}
            match={m}
            action={
              isFull(m) ? (
                <Link href="/jouer" className="btn-ghost px-5 py-2.5">
                  Complet
                </Link>
              ) : (
                <Link href="/jouer" className="btn-primary px-5 py-2.5">
                  Réserver
                </Link>
              )
            }
          />
        );
      })}
    </div>
  );
}
