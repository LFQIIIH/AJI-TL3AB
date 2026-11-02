"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSessionUser } from "@/lib/supabase/useSession";

const MIN_PASSWORD = 6;

/** Set or change the password (after a reset e-mail, or for Google / e-mail-link users). */
export default function PasswordForm() {
  const router = useRouter();
  const user = useSessionUser();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured || user === null) router.replace("/connexion");
  }, [user, router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Au moins ${MIN_PASSWORD} caractères.`);
    setState("saving");
    setError("");
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (error) {
      setState("idle");
      return setError(
        error.code === "same_password"
          ? "C'est déjà ton mot de passe actuel."
          : error.code === "weak_password"
            ? `Mot de passe trop faible : au moins ${MIN_PASSWORD} caractères.`
            : "Ça n'a pas marché. Réessaie dans un instant.",
      );
    }
    setState("saved");
    setTimeout(() => router.replace("/compte"), 1500);
  }

  if (!user) return <div className="card w-full max-w-md p-8 text-center text-ink-muted">Chargement…</div>;

  return (
    <div className="card w-full max-w-md p-6 sm:p-8">
      <p className="eyebrow">Espace joueur</p>
      <h1 className="headline mt-3 text-5xl">Ton mot de passe</h1>
      <p className="mt-3 text-ink-muted">Choisis un mot de passe pour te connecter avec ton e-mail, sans attendre de lien.</p>

      {state === "saved" ? (
        <p role="status" className="mt-6 rounded-xl bg-highlight/40 px-4 py-3 text-sm font-semibold text-highlight-ink">
          ✔ Mot de passe enregistré. On te ramène à ton compte…
        </p>
      ) : (
        <form onSubmit={save} className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Nouveau mot de passe</span>
            <span className="relative block">
              <input
                className="input pr-20"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                placeholder={`Au moins ${MIN_PASSWORD} caractères`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_PASSWORD}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-primary"
              >
                {show ? "Cacher" : "Afficher"}
              </button>
            </span>
          </label>
          <button type="submit" className="btn-primary w-full" disabled={state === "saving"}>
            {state === "saving" ? "Enregistrement…" : "Enregistrer"}
          </button>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </form>
      )}
      <Link href="/compte" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
        ← Retour à mon compte
      </Link>
    </div>
  );
}
