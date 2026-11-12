import { matches as staticMatches, type Match, type MatchCategory, type MatchFormat, type MatchLevel } from "@/data/matches";
import { MATCHES_REVALIDATE_SECONDS, MATCHES_SHEET_CSV_URL, MATCHES_SOURCE } from "@/lib/config";
import { marrakechParts, matchStart } from "@/lib/matches";
import { sheetToMatches } from "@/lib/sheet";
import { publicRpc } from "@/lib/supabase/publicApi";

/** Cache tag of the match list; the admin area revalidates it after each change. */
export const MATCHES_TAG = "matches";

type PublicMatchRow = {
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

async function getDatabaseMatches(): Promise<Match[]> {
  const rows = await publicRpc<PublicMatchRow>(
    "public_matches",
    {},
    { next: { revalidate: MATCHES_REVALIDATE_SECONDS, tags: [MATCHES_TAG] } },
  );
  return rows.map(rowToMatch);
}

async function getSheetMatches(): Promise<Match[]> {
  if (!MATCHES_SHEET_CSV_URL) return staticMatches;
  const res = await fetch(MATCHES_SHEET_CSV_URL, {
    next: { revalidate: MATCHES_REVALIDATE_SECONDS, tags: [MATCHES_TAG] },
  });
  if (!res.ok) throw new Error(`Matches sheet fetch failed: ${res.status} ${res.statusText}`);
  return sheetToMatches(await res.text());
}

/** The Google Sheet's matches (used by the one-click import in /admin). */
export async function getSheetMatchesForImport(): Promise<Match[]> {
  if (!MATCHES_SHEET_CSV_URL) return [];
  const res = await fetch(MATCHES_SHEET_CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Matches sheet fetch failed: ${res.status} ${res.statusText}`);
  return sheetToMatches(await res.text());
}

/**
 * All matches: from the database (MATCHES_SOURCE=supabase, managed in /admin)
 * or from the Google Sheet (default), else data/matches.ts.
 * A failed fetch throws on purpose: Next.js then keeps serving the last good
 * page instead of showing an empty or placeholder list.
 */
export async function getMatches(): Promise<Match[]> {
  return MATCHES_SOURCE === "supabase" ? getDatabaseMatches() : getSheetMatches();
}

export async function getUpcomingMatches(limit?: number, now: Date = new Date()): Promise<Match[]> {
  const upcoming = (await getMatches())
    .filter((m) => matchStart(m) > now)
    .sort((a, b) => matchStart(a).getTime() - matchStart(b).getTime());
  return limit ? upcoming.slice(0, limit) : upcoming;
}

/** Played matches that have a result, most recent first. */
export async function getRecentResults(limit?: number, now: Date = new Date()): Promise<Match[]> {
  const played = (await getMatches())
    .filter((m) => m.result && matchStart(m) <= now)
    .sort((a, b) => matchStart(b).getTime() - matchStart(a).getTime());
  return limit ? played.slice(0, limit) : played;
}
