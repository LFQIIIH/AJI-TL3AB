import type { Match, MatchCategory, MatchFormat, MatchLevel } from "@/data/matches";
import { marrakechParts } from "@/lib/matches";

// A row of public_matches() (Supabase) and its conversion to the Match shape
// the pages use. Shared by the server (lib/matches-source) and the browser.

export type PublicMatchRow = {
  id: string;
  starts_at: string;
  pitch: string;
  area: string;
  address: string;
  maps_url: string | null;
  format: MatchFormat;
  level: MatchLevel;
  category: MatchCategory;
  price_mad: number;
  total_spots: number;
  extra_spots: number;
  booked: number;
  waiting: number;
  home_name: string | null;
  away_name: string | null;
  home_score: number | null;
  away_score: number | null;
  mvp_name: string | null;
};

/** A row of public_matches() → the Match shape the pages already use. */
export function rowToMatch(r: PublicMatchRow): Match {
  const { date, time } = marrakechParts(r.starts_at);
  const played = r.home_score !== null && r.away_score !== null;
  return {
    id: r.id,
    date,
    time,
    startsAt: r.starts_at,
    pitch: r.pitch,
    area: r.area,
    address: r.address || undefined,
    mapsUrl: r.maps_url ?? undefined,
    format: r.format,
    level: r.level,
    category: r.category,
    priceMad: r.price_mad,
    totalSpots: r.total_spots,
    // Same meaning as the sheet's "réservées": places taken outside the site.
    // Online bookings are added on top (useMatchCounts / booking API).
    spotsTaken: Math.min(r.total_spots, r.extra_spots),
    result: played
      ? {
          home: { name: r.home_name ?? "Équipe 1", score: r.home_score! },
          away: { name: r.away_name ?? "Équipe 2", score: r.away_score! },
          ...(r.mvp_name ? { mvp: r.mvp_name } : {}),
        }
      : undefined,
  };
}
