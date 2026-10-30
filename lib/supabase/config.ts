// Set in Vercel → Settings → Environment Variables (see docs/LOGIN-SETUP.md).
// Supabase calls the public key "publishable key" (new) or "anon key" (legacy); either works.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** False until the env vars are set — login UI stays hidden and the site works as before. */
export const isSupabaseConfigured = SUPABASE_URL !== "" && SUPABASE_KEY !== "";
