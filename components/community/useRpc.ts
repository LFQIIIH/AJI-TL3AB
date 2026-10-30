"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseClient } from "@/lib/supabase/lazy";

/** Calls a public Supabase function; `undefined` while loading, `null` on error. */
export function useRpc<T>(fn: string, args: Record<string, unknown>, enabled = true): T[] | null | undefined {
  const [data, setData] = useState<T[] | null | undefined>(undefined);
  const key = JSON.stringify(args);

  useEffect(() => {
    if (!isSupabaseConfigured || !enabled) {
      setData(null);
      return;
    }
    let cancelled = false;
    setData(undefined);
    supabaseClient()
      .then((c) => c.rpc(fn, JSON.parse(key)))
      .then(({ data, error }) => !cancelled && setData(error ? null : ((data ?? []) as T[])))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, [fn, key, enabled]);

  return data;
}
