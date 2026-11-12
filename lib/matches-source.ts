import { matches as staticMatches, type Match } from "@/data/matches";
import { MATCHES_REVALIDATE_SECONDS, MATCHES_SHEET_CSV_URL, MATCHES_SOURCE } from "@/lib/config";
import { matchStart } from "@/lib/matches";
import { rowToMatch, type PublicMatchRow } from "@/lib/match-row";

export { rowToMatch };
import { sheetToMatches } from "@/lib/sheet";
import { publicRpc } from "@/lib/supabase/publicApi";

/** Cache tag of the match list; the admin area revalidates it after each change. */
export const MATCHES_TAG = "matches";

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

/** Next scheduled publication of matches (ISO), or null: for the countdown on /jouer. */
export async function getNextPublication(): Promise<string | null> {
  if (MATCHES_SOURCE !== "supabase") return null;
  try {
    const value = (await publicRpc<string | null>("next_publication", {}, {
      next: { revalidate: MATCHES_REVALIDATE_SECONDS, tags: [MATCHES_TAG] },
    })) as unknown;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

/** Short names ("Yassine B.") of the players at each played match, for the history search. */
export async function getMatchPlayers(matchIds: string[]): Promise<Record<string, string[]>> {
  if (MATCHES_SOURCE !== "supabase" || !matchIds.length) return {};
  try {
    const rows = await publicRpc<{ match_id: string; player: string }>("public_match_players", { p_match_ids: matchIds }, {
      next: { revalidate: MATCHES_REVALIDATE_SECONDS, tags: [MATCHES_TAG] },
    });
    const out: Record<string, string[]> = {};
    for (const r of rows) (out[r.match_id] ??= []).push(r.player);
    return out;
  } catch {
    return {};
  }
}
