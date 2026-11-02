"use client";

import { useCallback, useEffect, useState } from "react";
import type { Match } from "@/data/matches";
import type { MatchCounts } from "@/lib/community";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { publicRpc } from "@/lib/supabase/publicApi";

/**
 * Online bookings + waiting list per match (public counts, no names).
 * Until loaded — or without Supabase — returns {} and the sheet numbers stand.
 */
export function useMatchCounts(matchIds: string[]) {
  const [counts, setCounts] = useState<MatchCounts>({});
  const key = matchIds.join("|");

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured || !key) return;
    try {
      const rows = await publicRpc<{ match_id: string; booked: number; waiting: number }>("match_booking_counts", {
        p_match_ids: key.split("|"),
      });
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

  return { counts, reload };
}

/** The sheet's numbers plus online bookings. */
export function withOnlineBookings(m: Match, counts: MatchCounts): Match {
  const online = counts[m.id]?.booked ?? 0;
  return online ? { ...m, spotsTaken: Math.min(m.totalSpots, m.spotsTaken + online) } : m;
}
