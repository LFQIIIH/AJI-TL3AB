"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSessionUser } from "@/lib/supabase/useSession";

export default function LoginPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useSessionUser();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(params.get("erreur") ? "La connexion n'a pas abouti. Réessaie." : "");

  useEffect(() => {
    if (user) router.replace("/compte");
  }, [user, router]);

  async function signInWithGoogle() {
    setPending(true);
    setError("");
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/compte` },
    });
    if (error) {
      setError("Impossible de contacter Google. Réessaie dans un instant.");
      setPending(false);
    }
  }

  return (
    <div className="card w-full max-w-md p-6 sm:p-8">
      <p className="eyebrow">Espace joueur</p>
      <h1 className="headline mt-3 text-5xl">Connexion</h1>

      {isSupabaseConfigured ? (
        <>
          <p className="mt-4 text-ink-muted">
            Connecte-toi pour créer ton profil joueur : nom, téléphone et poste. Bientôt : classements et tirage au sort
            mensuel.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={pending || user === undefined}
            className="btn mt-8 w-full border border-line-strong bg-surface text-ink hover:border-ink"
          >
            <GoogleIcon />
            {pending ? "Redirection…" : "Continuer avec Google"}
          </button>
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <p className="mt-6 text-xs text-ink-muted">
            On utilise Google uniquement pour vérifier ton identité. Ton numéro de téléphone reste privé.{" "}
            <Link href="/confidentialite" className="font-semibold text-primary hover:underline">
              Confidentialité
            </Link>
          </p>
        </>
      ) : (
        <p className="mt-4 text-ink-muted">L&apos;espace joueur arrive très bientôt. Inchallah !</p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
