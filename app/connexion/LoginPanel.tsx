"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSessionUser } from "@/lib/supabase/useSession";

type Mode = "login" | "signup";
type Notice = { kind: "info" | "error"; text: string } | null;

const MIN_PASSWORD = 6;

/** Supabase auth error → short French message. */
function authMessage(error: { code?: string; message: string; status?: number }): string {
  const code = error.code ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(error.message)) return "E-mail ou mot de passe incorrect.";
  if (code === "email_not_confirmed") return "Confirme d'abord ton e-mail : clique sur le lien qu'on t'a envoyé (regarde aussi les spams).";
  if (code === "user_already_exists" || /already registered/i.test(error.message)) return "Un compte existe déjà avec cet e-mail. Connecte-toi.";
  if (code === "weak_password") return `Mot de passe trop faible : au moins ${MIN_PASSWORD} caractères.`;
  if (code.startsWith("over_") || error.status === 429) return "Trop de tentatives. Réessaie dans quelques minutes.";
  if (code === "email_address_invalid") return "Cette adresse e-mail n'a pas l'air correcte.";
  return "Ça n'a pas marché. Réessaie dans un instant.";
}

export default function LoginPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useSessionUser();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"google" | "password" | "reset" | "link" | null>(null);
  const [notice, setNotice] = useState<Notice>(
    params.get("erreur") ? { kind: "error", text: "La connexion n'a pas abouti. Réessaie." } : null,
  );

  useEffect(() => {
    if (user) router.replace("/compte");
  }, [user, router]);

  const address = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
  const callback = (next: string) => `${window.location.origin}/auth/callback?next=${next}`;

  async function signInWithGoogle() {
    setBusy("google");
    setNotice(null);
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback("/compte") },
    });
    if (error) {
      setNotice({ kind: "error", text: "Impossible de contacter Google. Réessaie dans un instant." });
      setBusy(null);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!emailOk) return setNotice({ kind: "error", text: "Cette adresse e-mail n'a pas l'air correcte." });
    if (password.length < MIN_PASSWORD) {
      return setNotice({ kind: "error", text: `Ton mot de passe doit faire au moins ${MIN_PASSWORD} caractères.` });
    }
    setBusy("password");
    setNotice(null);
    const auth = getSupabaseBrowserClient().auth;

    if (mode === "login") {
      const { error } = await auth.signInWithPassword({ email: address, password });
      setBusy(null);
      if (error) return setNotice({ kind: "error", text: authMessage(error) });
      return router.replace("/compte");
    }

    const { data, error } = await auth.signUp({
      email: address,
      password,
      options: { emailRedirectTo: callback("/compte") },
    });
    setBusy(null);
    if (error) return setNotice({ kind: "error", text: authMessage(error) });
    if (data.session) return router.replace("/compte");
    // With e-mail confirmation on, an existing address comes back with no identities.
    if (data.user && data.user.identities?.length === 0) {
      setMode("login");
      return setNotice({ kind: "error", text: "Un compte existe déjà avec cet e-mail. Connecte-toi." });
    }
    setNotice({
      kind: "info",
      text: `Presque fini ! Clique sur le lien envoyé à ${address} pour activer ton compte (une seule fois). Regarde aussi les spams.`,
    });
  }

  async function forgotPassword() {
    if (!emailOk) return setNotice({ kind: "error", text: "Tape d'abord ton adresse e-mail ci-dessus." });
    setBusy("reset");
    setNotice(null);
    const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(address, {
      redirectTo: callback("/compte/mot-de-passe"),
    });
    setBusy(null);
    setNotice(
      error
        ? { kind: "error", text: authMessage(error) }
        : { kind: "info", text: `C'est envoyé ! Ouvre l'e-mail envoyé à ${address} sur cet appareil pour choisir un nouveau mot de passe.` },
    );
  }

  async function sendMagicLink() {
    if (!emailOk) return setNotice({ kind: "error", text: "Tape d'abord ton adresse e-mail ci-dessus." });
    setBusy("link");
    setNotice(null);
    const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callback("/compte") },
    });
    setBusy(null);
    setNotice(
      error
        ? { kind: "error", text: authMessage(error) }
        : { kind: "info", text: `Lien envoyé à ${address} 📩 Ouvre-le sur cet appareil pour te connecter.` },
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
            Connecte-toi en 10 secondes et rejoins l&apos;équipe : réserve tes matchs en un clic, vote pour les meilleurs joueurs
            et tente ta chance au tirage du mois. ⚽
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={busy !== null || user === undefined}
            className="btn mt-8 w-full border border-line-strong bg-surface text-ink hover:border-ink"
          >
            <GoogleIcon />
            {busy === "google" ? "Redirection…" : "Continuer avec Google"}
          </button>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <span className="h-px flex-1 bg-line" />
            ou avec ton e-mail
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-full bg-canvas-deep p-1" role="tablist">
            {(
              [
                ["login", "J'ai un compte"],
                ["signup", "Créer un compte"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => {
                  setMode(value);
                  setNotice(null);
                }}
                className={`rounded-full px-3 py-2 text-sm font-bold transition ${
                  mode === value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submitPassword} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">E-mail</span>
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
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-semibold">
                  Mot de passe
                </label>
                {mode === "login" && (
                  <button type="button" onClick={forgotPassword} disabled={busy !== null} className="text-xs font-semibold text-primary hover:underline">
                    {busy === "reset" ? "Envoi…" : "Mot de passe oublié ?"}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  className="input pr-12"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder={mode === "login" ? "Ton mot de passe" : `Au moins ${MIN_PASSWORD} caractères`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={MIN_PASSWORD}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-muted hover:text-ink"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={busy !== null || user === undefined}>
              {busy === "password" ? "Un instant…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          {notice && (
            <p
              role={notice.kind === "error" ? "alert" : "status"}
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                notice.kind === "error" ? "bg-red-50 text-red-700" : "bg-highlight/40 font-semibold text-highlight-ink"
              }`}
            >
              {notice.text}
            </p>
          )}

          {mode === "login" && (
            <p className="mt-4 text-center text-xs text-ink-muted">
              Pas envie de mot de passe ?{" "}
              <button type="button" onClick={sendMagicLink} disabled={busy !== null} className="font-semibold text-primary hover:underline">
                {busy === "link" ? "Envoi…" : "Reçois un lien de connexion par e-mail"}
              </button>
            </p>
          )}

          <p className="mt-6 text-xs text-ink-muted">
            Tu restes connecté sur cet appareil. Ton numéro de téléphone reste privé.{" "}
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

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
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
