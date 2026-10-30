"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./config";

/**
 * Current user for UI purposes (navbar, redirects). Data access is still
 * protected server-side by Row Level Security, not by this hook.
 * `undefined` while loading, `null` when signed out.
 *
 * The Supabase client is imported lazily so pages that only need the navbar
 * don't block first paint on it.
 */
export function useSessionUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(isSupabaseConfigured ? undefined : null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    import("./client").then(({ getSupabaseBrowserClient }) => {
      if (cancelled) return;
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data }) => !cancelled && setUser(data.session?.user ?? null));
      const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
      unsubscribe = () => data.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return user;
}
