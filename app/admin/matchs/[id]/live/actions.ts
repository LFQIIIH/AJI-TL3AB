"use server";

import { dbMessage, requireStaff } from "@/lib/admin";
import { refreshSite } from "@/lib/refresh-site";
import { loadLive, type LiveState } from "./data";

type Result = { error?: string; state?: LiveState };

function liveMessage(error: { message?: string; code?: string }): string {
  const m = error.message ?? "";
  if (m.includes("not_live")) return "Le direct s'ouvre 30 min avant le coup d'envoi et se ferme 3 jours après.";
  if (m.includes("not_in_match")) return "Ce joueur n'est pas inscrit à ce match.";
  if (m.includes("team_required")) return "Choisis d'abord l'équipe du buteur.";
  return dbMessage(error);
}

/** Put a player in Équipe 1 ("home"), Équipe 2 ("away") or nowhere (null). */
export async function liveSetTeam(matchId: string, userId: string, team: "home" | "away" | null): Promise<Result> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("staff_set_team", { p_match_id: matchId, p_user_id: userId, p_team: team });
  if (error) return { error: liveMessage(error) };
  return { state: await loadLive(supabase, matchId) };
}

/** Goal (scorer or guest + team, optional assist) or yellow / red card. */
export async function liveAddEvent(input: {
  matchId: string;
  kind: "goal" | "yellow" | "red";
  userId: string | null;
  assistId?: string | null;
  team?: "home" | "away" | null;
  minute?: number | null;
}): Promise<Result> {
  const { supabase } = await requireStaff();
  const minute = input.minute != null && Number.isInteger(input.minute) && input.minute >= 0 && input.minute <= 200 ? input.minute : null;
  const { error } = await supabase.rpc("staff_add_event", {
    p_match_id: input.matchId,
    p_kind: input.kind,
    p_user_id: input.userId,
    p_assist_id: input.assistId ?? null,
    p_team: input.team ?? null,
    p_minute: minute,
  });
  if (error) return { error: liveMessage(error) };
  refreshSite();
  return { state: await loadLive(supabase, input.matchId) };
}

/** Undo an event (the score is recounted). */
export async function liveDeleteEvent(matchId: string, eventId: number): Promise<Result> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("staff_delete_event", { p_event_id: eventId });
  if (error) return { error: liveMessage(error) };
  refreshSite();
  return { state: await loadLive(supabase, matchId) };
}

/** Re-read everything (after another captain's change). */
export async function liveReload(matchId: string): Promise<Result> {
  const { supabase } = await requireStaff();
  return { state: await loadLive(supabase, matchId) };
}
