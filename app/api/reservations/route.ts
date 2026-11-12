import { NextResponse, type NextRequest } from "next/server";
import { SHOE_SIZES } from "@/lib/shoes";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

function validShoeSize(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= SHOE_SIZES[0] && v <= SHOE_SIZES[SHOE_SIZES.length - 1] ? v : null;
}

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
 * Book the signed-in player (+ optional friend, shoe rental) on a match and
 * pay from their wallet. Everything is checked by the database in one go
 * (public.book_match): complete profile, accepted rules, balance, published
 * and not started, places left, shoe stock.
 */
export async function POST(request: NextRequest) {
  const auth = await signedInClient();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = (await request.json().catch(() => null)) as {
    matchId?: unknown;
    guests?: unknown;
    shoeSize?: unknown;
    guestShoeSize?: unknown;
  } | null;
  const matchId = typeof body?.matchId === "string" ? body.matchId : "";
  if (!matchId) return fail(404, "match_not_found");
  const guests = body?.guests === 1 ? 1 : 0;
  // Shoe rental (sizes 38–45); stock per size is enforced by the database.
  const shoeSize = validShoeSize(body?.shoeSize);
  const guestShoeSize = guests ? validShoeSize(body?.guestShoeSize) : null;

  const { data: paid, error } = await supabase.rpc("book_match", {
    p_match_id: matchId,
    p_guests: guests,
    p_shoe_size: shoeSize,
    p_guest_shoe_size: guestShoeSize,
  });
  if (error) {
    const m = error.message;
    if (error.code === "23505") return fail(409, "already_booked");
    for (const [code, status] of [
      ["insufficient_balance", 402],
      ["profile_missing", 412],
      ["profile_incomplete", 412],
      ["rules_not_accepted", 412],
      ["shoes_unavailable", 409],
      ["match_full", 409],
      ["match_started", 410],
      ["match_unavailable", 410],
    ] as const) {
      if (m.includes(code)) return fail(status, code === "match_full" ? "full" : code === "match_unavailable" ? "match_started" : code);
    }
    return fail(400, "booking_failed");
  }
  return NextResponse.json({ ok: true, paid: paid as number }, { headers: noStore });
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
