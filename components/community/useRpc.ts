"use client";

import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { publicRpc } from "@/lib/supabase/publicApi";

/**
 * Calls a public Supabase function; `undefined` while loading, `null` on error.
 * `initial`: rows the server already fetched for these same args, so the
 * content is in the HTML. They show at once and are refreshed in the background.
 * If a refresh fails (weak connection), the rows already shown for these same
 * args stay on screen instead of an error.
 */
export function useRpc<T>(fn: string, args: Record<string, unknown>, enabled = true, initial?: T[]): T[] | null | undefined {
  const [data, setData] = useState<T[] | null | undefined>(initial);
  const key = JSON.stringify(args);
  const keepInitial = useRef(initial !== undefined);
  // Last rows successfully shown, and for which args.
  const lastGood = useRef<{ key: string; rows: T[] } | null>(initial !== undefined ? { key, rows: initial } : null);

  useEffect(() => {
    if (!isSupabaseConfigured || !enabled) {
      setData(null);
      return;
    }
    let cancelled = false;
    if (keepInitial.current) keepInitial.current = false;
    else setData(undefined);
    publicRpc<T>(fn, JSON.parse(key))
      .then((rows) => {
        if (cancelled) return;
        lastGood.current = { key, rows };
        setData(rows);
      })
      .catch(() => {
        if (cancelled) return;
        setData(lastGood.current?.key === key ? lastGood.current.rows : null);
      });
    return () => {
      cancelled = true;
    };
  }, [fn, key, enabled]);

  return data;
}
