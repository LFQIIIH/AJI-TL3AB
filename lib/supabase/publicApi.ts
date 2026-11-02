import { SUPABASE_KEY, SUPABASE_URL } from "./config";

// Public (logged-out) reads straight from Supabase's REST API with fetch, so
// visitors don't download the full Supabase client just to see counts.
// Only returns what RLS / public functions allow for anonymous users.

// Legacy "anon" keys are JWTs and also go in Authorization; new publishable
// keys only go in the apikey header.
const headers: Record<string, string> = {
  apikey: SUPABASE_KEY,
  "Content-Type": "application/json",
  ...(SUPABASE_KEY.split(".").length === 3 ? { Authorization: `Bearer ${SUPABASE_KEY}` } : {}),
};

// Identical requests made at the same time (e.g. two cards on one page) share one call.
const inFlight = new Map<string, Promise<unknown>>();

function shared<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const p = run().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return (await res.json()) as T;
}

/** Calls a public SQL function, e.g. publicRpc("draw_status", { p_month: "2026-11-01" }). */
export function publicRpc<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const body = JSON.stringify(args);
  return shared(`rpc:${fn}:${body}`, () =>
    fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers, body }).then((r) => json<T[]>(r)),
  );
}

/** Reads a public table with a PostgREST query, e.g. "draws?select=month&order=month.desc&limit=1". */
export function publicSelect<T>(query: string): Promise<T[]> {
  return shared(`get:${query}`, () => fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers }).then((r) => json<T[]>(r)));
}
