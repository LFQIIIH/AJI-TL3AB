"use client";

import Link from "next/link";
import type { Match } from "@/data/matches";
import MatchCard from "@/components/MatchCard";
import { isFull } from "@/lib/matches";
import { useMatchCounts, withOnlineBookings } from "@/lib/useMatchCounts";

/** Next matches on the home page, counting online bookings. */
/** `countIds`: pass the same ids as NextMatchCard so both share one request. */
export default function UpcomingCards({ matches, countIds }: { matches: Match[]; countIds: string[] }) {
  const { counts } = useMatchCounts(countIds);
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
                  Complet<span className="sr-only"> : voir les autres matchs</span>
                </Link>
              ) : (
                <Link href="/jouer" className="btn-primary px-5 py-2.5">
                  Réserver<span className="sr-only"> ce match à {m.pitch}</span>
                </Link>
              )
            }
          />
        );
      })}
    </div>
  );
}
