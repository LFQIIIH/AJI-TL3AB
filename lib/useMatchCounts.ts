"use client";

import { useCallback, useEffect, useState } from "react";
import type { Match } from "@/data/matches";
import type { MatchCounts } from "@/lib/community";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { publicRpc } from "@/lib/supabase/publicApi";

/**
 * Online bookings + waiting list per match (public counts), plus the
 * initials of the first players booked (public profiles only).
 * Until loaded — or without Supabase — returns {} and the sheet numbers stand.
 */
export function useMatchCounts(matchIds: string[]) {
  const [counts, setCounts] = useState<MatchCounts>({});
  const [initials, setInitials] = useState<Record<string, string[]>>({});
  const key = matchIds.join("|");

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured || !key) return;
    try {
      const ids = key.split("|");
      const [rows, faces] = await Promise.all([
        publicRpc<{ match_id: string; booked: number; waiting: number }>("match_booking_counts", { p_match_ids: ids }),
        // Optional decoration: a failure here must not hide the counts.
        publicRpc<{ match_id: string; initial: string }>("match_booked_initials", { p_match_ids: ids }).catch(() => []),
      ]);
      const byMatch: Record<string, string[]> = {};
      for (const f of faces) (byMatch[f.match_id] ??= []).push(f.initial);
      setInitials(byMatch);
      const next: MatchCounts = {};
      for (const r of rows) {
        next[r.match_id] = { booked: r.booked, waiting: r.waiting };
      }
      setCounts(next);
    } catch {}
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { counts, initials, reload };
}

/** The sheet's numbers plus online bookings. */
export function withOnlineBookings(m: Match, counts: MatchCounts): Match {
  const online = counts[m.id]?.booked ?? 0;
  return online ? { ...m, spotsTaken: Math.min(m.totalSpots, m.spotsTaken + online) } : m;
}
