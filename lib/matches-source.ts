import { matches as staticMatches, type Match } from "@/data/matches";
import { MATCHES_REVALIDATE_SECONDS, MATCHES_SHEET_CSV_URL } from "@/lib/config";
import { matchStart } from "@/lib/matches";
import { sheetToMatches } from "@/lib/sheet";

/**
 * All matches, from the Google Sheet when configured, else data/matches.ts.
 * A failed sheet fetch throws on purpose: Next.js then keeps serving the last
 * good page instead of showing an empty or placeholder list.
 */
export async function getMatches(): Promise<Match[]> {
  if (!MATCHES_SHEET_CSV_URL) return staticMatches;

  const res = await fetch(MATCHES_SHEET_CSV_URL, {
    next: { revalidate: MATCHES_REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Matches sheet fetch failed: ${res.status} ${res.statusText}`);
  return sheetToMatches(await res.text());
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
