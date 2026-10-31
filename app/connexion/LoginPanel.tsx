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
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent">("idle");
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

  // Passwordless: Supabase e-mails a one-time login link.
  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Cette adresse e-mail n'a pas l'air correcte.");
      return;
    }
    setEmailState("sending");
    setError("");
    const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/compte` },
    });
    if (!error) {
      setEmailState("sent");
      return;
    }
    setEmailState("idle");
    // Until a sending service is connected in Supabase, only team addresses
    // receive e-mails; everyone else is sent to Google.
    setError(
      error.status === 429
        ? "Trop de demandes. Réessaie dans quelques minutes."
        : "La connexion par e-mail n'est pas encore disponible. Utilise Google en attendant 🙏",
    );
  }

  return (
    <div className="card w-full max-w-md p-6 sm:p-8">
      <p className="eyebrow">Espace joueur</p>
      <h1 className="headline mt-3 text-5xl">
        Mrehba{" "}
        <span className="whitespace-nowrap">
          <span className="text-primary">bik</span> ! 👋
        </span>
      </h1>

      {isSupabaseConfigured ? (
        <>
          <p className="mt-4 text-ink-muted">
            Connecte-toi en 10 secondes et rejoins l&apos;équipe : réserve tes matchs en un clic, vote pour les meilleurs
            joueurs et tente ta chance au tirage du mois. ⚽
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

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <span className="h-px flex-1 bg-line" />
            ou avec ton e-mail
            <span className="h-px flex-1 bg-line" />
          </div>

          {emailState === "sent" ? (
            <div className="rounded-xl bg-highlight/40 px-4 py-4 text-sm text-highlight-ink" role="status">
              <p className="font-bold">C&apos;est envoyé ! 📩</p>
              <p className="mt-1">
                Ouvre l&apos;e-mail envoyé à <strong>{email.trim().toLowerCase()}</strong> sur cet appareil et clique sur le lien pour te
                connecter. Pense à regarder dans les spams.
              </p>
              <button type="button" onClick={() => setEmailState("idle")} className="mt-2 font-semibold underline">
                Changer d&apos;adresse
              </button>
            </div>
          ) : (
            <form onSubmit={signInWithEmail} className="space-y-3">
              <label className="block">
                <span className="sr-only">Ton adresse e-mail</span>
                <input
                  className="input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="ton.email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn-primary w-full" disabled={emailState === "sending" || user === undefined}>
                {emailState === "sending" ? "Envoi…" : "Recevoir mon lien de connexion"}
              </button>
              <p className="text-center text-xs text-ink-muted">Pas de mot de passe : on t&apos;envoie un lien magique.</p>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <p className="mt-6 text-xs text-ink-muted">
            Google et ton e-mail servent uniquement à vérifier ton identité. Ton numéro de téléphone reste privé.{" "}
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
