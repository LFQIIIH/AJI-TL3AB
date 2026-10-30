"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Match } from "@/data/matches";
import { Icon } from "@/components/Icons";
import RelativeDay from "@/components/RelativeDay";
import { formatDay, formatTime, isFull, spotsLeft } from "@/lib/matches";
import { useMatchCounts, withOnlineBookings } from "@/lib/useMatchCounts";

/** Hero card: next match that still has room, counting online bookings. */
export default function NextMatchCard({ matches }: { matches: Match[] }) {
  const candidates = matches.slice(0, 10);
  const { counts } = useMatchCounts(candidates.map((m) => m.id));
  const next = useMemo(() => candidates.map((m) => withOnlineBookings(m, counts)).find((m) => !isFull(m)), [candidates, counts]);
  if (!next) return null;
  const left = spotsLeft(next);

  return (
    <Link href="/jouer" className="group block rounded-2xl bg-forest p-6 text-white shadow-xl shadow-forest/20 transition hover:bg-forest-light">
      <p className="eyebrow flex items-center gap-2 text-highlight">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-highlight opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-highlight" />
        </span>
        Prochain match
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white/70">
            <span className="capitalize">{formatDay(next.date)}</span>
            <RelativeDay date={next.date} />
          </p>
          <p className="headline mt-1 text-6xl">{formatTime(next.time)}</p>
        </div>
        <span className="headline rounded-lg bg-highlight px-3 py-1.5 text-2xl text-highlight-ink">{next.format}</span>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm">
        <Icon name="pin" className="h-4 w-4 text-highlight" />
        <span className="font-semibold">{next.pitch}</span>
        {next.area && <span className="text-white/70">· {next.area}</span>}
      </p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-forest-light pt-4">
        <p className="text-sm">
          <span className="font-bold text-highlight">{left}</span> {left > 1 ? "places" : "place"} ·{" "}
          <span className="font-bold">{next.priceMad} MAD</span>
        </p>
        <span className="text-sm font-bold uppercase tracking-wide text-highlight group-hover:underline">Réserver →</span>
      </div>
    </Link>
  );
}
