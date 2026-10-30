import { NextResponse, type NextRequest } from "next/server";
import { getMatches } from "@/lib/matches-source";
import { matchStart } from "@/lib/matches";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: noStore });
}

async function signedInClient() {
  if (!isSupabaseConfigured) return { error: fail(503, "not_configured") } as const;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: fail(401, "not_signed_in") } as const;
  return { supabase } as const;
}

/**
 * Book the signed-in player (+ optional friend) on a match.
 * Capacity = spots in the Google Sheet ("reservees" there are WhatsApp/guest
 * bookings) + online bookings in Supabase.
 */
export async function POST(request: NextRequest) {
  const auth = await signedInClient();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = (await request.json().catch(() => null)) as { matchId?: unknown; guests?: unknown } | null;
  const matchId = typeof body?.matchId === "string" ? body.matchId : "";
  const guests = body?.guests === 1 ? 1 : 0;

  const match = (await getMatches()).find((m) => m.id === matchId);
  if (!match) return fail(404, "match_not_found");
  const start = matchStart(match);
  if (start <= new Date()) return fail(410, "match_started");

  const { data: counts, error: countsError } = await supabase.rpc("match_booking_counts", { p_match_ids: [matchId] });
  if (countsError) return fail(502, "counts_unavailable");
  const online = (counts as { booked: number }[] | null)?.[0]?.booked ?? 0;
  if (match.spotsTaken + online + 1 + guests > match.totalSpots) return fail(409, "full");

  const { error } = await supabase.from("bookings").insert({
    match_id: matchId,
    match_date: match.date,
    match_start: start.toISOString(),
    guests,
  });
  if (error) {
    if (error.code === "23505") return fail(409, "already_booked");
    if (error.code === "23503") return fail(412, "profile_missing");
    return fail(400, "booking_failed");
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}

/** Cancel the signed-in player's booking; freed spots go to the waiting list. */
export async function DELETE(request: NextRequest) {
  const auth = await signedInClient();
  if ("error" in auth) return auth.error;

  const matchId = request.nextUrl.searchParams.get("matchId") ?? "";
  const { data, error } = await auth.supabase.rpc("cancel_booking", { p_match_id: matchId });
  if (error) return fail(error.message.includes("no_booking") ? 404 : 400, "cancel_failed");
  return NextResponse.json({ ok: true, promoted: data as number }, { headers: noStore });
}
