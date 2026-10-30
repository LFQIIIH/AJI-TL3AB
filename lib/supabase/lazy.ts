/** Loads the Supabase browser client on demand (keeps it out of first paint). */
export async function supabaseClient() {
  const { getSupabaseBrowserClient } = await import("./client");
  return getSupabaseBrowserClient();
}
