import type { getSupabaseServerClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof getSupabaseServerClient>>;

export type LivePlayer = {
  user_id: string;
  name: string;
  guests: number;
  attended: boolean | null;
  goals: number;
  assists: number;
  team: "home" | "away" | null;
};
export type LiveEvent = {
  id: number;
  kind: "goal" | "yellow" | "red";
  team: "home" | "away" | null;
  minute: number | null;
  player: string | null;
  assist: string | null;
};
export type LiveState = {
  players: LivePlayer[];
  events: LiveEvent[];
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
};

type RosterRow = {
  user_id: string;
  player_name: string | null;
  status: string;
  guests: number;
  attended: boolean | null;
  goals: number | null;
  assists: number | null;
  team: "home" | "away" | null;
};

/** Roster (booked players), events and score of a match, for the live screen. */
export async function loadLive(supabase: Client, matchId: string): Promise<LiveState> {
  const [roster, events, match] = await Promise.all([
    supabase.rpc("staff_match_roster", { p_match_id: matchId }),
    supabase.rpc("staff_match_events", { p_match_id: matchId }),
    supabase.from("matches").select("home_name, away_name, home_score, away_score").eq("id", matchId).maybeSingle(),
  ]);
  const players = ((roster.data ?? []) as RosterRow[])
    .filter((r) => r.status === "booked")
    .map((r) => ({
      user_id: r.user_id,
      name: r.player_name ?? "Joueur",
      guests: r.guests,
      attended: r.attended,
      goals: r.goals ?? 0,
      assists: r.assists ?? 0,
      team: r.team,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return {
    players,
    events: (events.data ?? []) as LiveEvent[],
    homeName: match.data?.home_name || "Équipe 1",
    awayName: match.data?.away_name || "Équipe 2",
    homeScore: match.data?.home_score ?? null,
    awayScore: match.data?.away_score ?? null,
  };
}
