import type { PointsRow } from "@/app/classement/PointsRanking";
import type { LeaderboardRow } from "@/app/classement/Leaderboard";
import type { DrawStatus, DrawWinner } from "@/components/community/DrawInfo";
import type { TeamOfMonthRow } from "@/components/community/TeamOfMonth";
import { currentMonthRange } from "@/lib/community";
import { MATCHES_REVALIDATE_SECONDS } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { publicRpc, publicSelect } from "@/lib/supabase/publicApi";

// Server-side reads of the public community data (ranking, team of the month,
// monthly draw) so those sections are in the page HTML for search engines.
// Any failure returns undefined and the browser loads the data as before.

function init(): RequestInit {
  return { next: { revalidate: MATCHES_REVALIDATE_SECONDS }, signal: AbortSignal.timeout(4000) };
}

async function safe<T>(load: () => Promise<T>): Promise<T | undefined> {
  if (!isSupabaseConfigured) return undefined;
  try {
    return await load();
  } catch {
    return undefined;
  }
}

export function getMonthLeaderboard() {
  const { from, to } = currentMonthRange();
  return safe(() => publicRpc<LeaderboardRow>("leaderboard", { p_from: from, p_to: to, p_limit: 10 }, init()));
}

export function getTeamOfMonth() {
  return safe(() => publicRpc<TeamOfMonthRow>("team_of_month", { p_month: currentMonthRange().month }, init()));
}

export function getDrawStatus() {
  return safe(() => publicRpc<DrawStatus>("draw_status", { p_month: currentMonthRange().month }, init()));
}

export function getDrawWinners(limit: number) {
  return safe(() => publicSelect<DrawWinner>(`draws?select=month,winner_name,entrants&order=month.desc&limit=${limit}`, init()));
}

export function getPointsLeaderboard() {
  return safe(() => publicRpc<PointsRow>("points_leaderboard", { p_month: currentMonthRange().month, p_limit: 20 }, init()));
}
