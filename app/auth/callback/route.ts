import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/** Only allow same-site relative paths, so ?next= can't redirect off-site. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/compte";
}

// Google → Supabase → here with ?code=…; exchange it for a session cookie.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const failure = NextResponse.redirect(`${origin}/connexion?erreur=1`);

  if (!isSupabaseConfigured || !code) return failure;

  const response = NextResponse.redirect(`${origin}${safeNext(searchParams.get("next"))}`);
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? failure : response;
}
