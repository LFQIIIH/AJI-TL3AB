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
 * don't block first paint on it — and not at all for visitors without a
 * Supabase session cookie (they're logged out; a login always ends with a
 * full page load, which runs this again).
 */
export function useSessionUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(isSupabaseConfigured ? undefined : null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!/(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/.test(document.cookie)) {
      setUser(null);
      return;
    }
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    import("./client").then(({ getSupabaseBrowserClient }) => {
      if (cancelled) return;
      const supabase = getSupabaseBrowserClient();
      // Keep the same object while it's the same person: Supabase re-announces the
      // session (token refresh, coming back to the tab…) and a new object each
      // time would make every component reload its data in a loop.
      const update = (next: User | null) => setUser((prev) => (prev && next && prev.id === next.id ? prev : next));
      supabase.auth.getSession().then(({ data }) => !cancelled && update(data.session?.user ?? null));
      const { data } = supabase.auth.onAuthStateChange((_event, session) => update(session?.user ?? null));
      unsubscribe = () => data.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return user;
}
