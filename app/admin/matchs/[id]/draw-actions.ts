"use server";

import { revalidatePath } from "next/cache";
import { dbMessage, requireStaff } from "@/lib/admin";
import type { TeamDraw } from "@/lib/team-draw";

/** Saves the draw on the match (2 teams: also team names + each booked player's team). */
export async function saveDraw(matchId: string, draw: TeamDraw | null): Promise<{ error?: string }> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("staff_save_draw", { p_match_id: matchId, p_draw: draw });
  if (error) return { error: error.message.includes("invalid_draw") ? "Tirage invalide (2 à 4 équipes)." : dbMessage(error) };
  revalidatePath(`/admin/matchs/${encodeURIComponent(matchId)}`);
  revalidatePath(`/admin/matchs/${encodeURIComponent(matchId)}/live`);
  return {};
}
