"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSessionUser } from "@/lib/supabase/useSession";
import { firstName, formatPhone, normalizePhone, POSITIONS, type Position, type Profile } from "@/lib/profile";

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export default function AccountPanel() {
  const router = useRouter();
  const user = useSessionUser();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (!isSupabaseConfigured || user === null) router.replace("/connexion");
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getSupabaseBrowserClient()
      .from("profiles")
      .select("id, full_name, phone, position, consent_at")
      .eq("id", user.id)
      .maybeSingle<Profile>()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setStatus({ kind: "error", message: "Impossible de charger ton profil. Recharge la page." });
          return;
        }
        setProfile(data);
        setFullName(data?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? "");
        setPhone(data ? formatPhone(data.phone) : "");
        setPosition(data?.position ?? "");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isNew = profile === null;
  const normalizedPhone = normalizePhone(phone);
  const phoneInvalid = phone.trim() !== "" && normalizedPhone === null;
  const canSave =
    fullName.trim().length >= 2 && normalizedPhone !== null && position !== "" && (!isNew || consent) && status.kind !== "saving";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canSave || !normalizedPhone) return;
    setStatus({ kind: "saving" });
    const row = {
      id: user.id,
      full_name: fullName.trim().replace(/\s+/g, " "),
      phone: normalizedPhone,
      position,
      consent_at: profile?.consent_at ?? new Date().toISOString(),
    };
    const { data, error } = await getSupabaseBrowserClient()
      .from("profiles")
      .upsert(row)
      .select("id, full_name, phone, position, consent_at")
      .single<Profile>();
    if (error) {
      setStatus({ kind: "error", message: "L'enregistrement a échoué. Vérifie tes infos et réessaie." });
      return;
    }
    setProfile(data);
    setPhone(formatPhone(data.phone));
    setStatus({ kind: "saved" });
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/");
  }

  if (!user || profile === undefined) {
    return (
      <div className="card w-full max-w-lg p-8 text-center text-ink-muted" aria-busy="true">
        {status.kind === "error" ? status.message : "Chargement…"}
      </div>
    );
  }

  return (
    <div className="card w-full max-w-lg p-6 sm:p-8">
      <p className="eyebrow">Espace joueur</p>
      <h1 className="headline mt-3 text-5xl">
        {isNew ? "Crée ton profil" : `Salam ${firstName(profile?.full_name ?? "")}`}
      </h1>
      <p className="mt-3 text-ink-muted">
        {isNew
          ? "Quelques infos et c'est bon. Ça prend 30 secondes."
          : "Tes infos joueur. Tu peux les modifier à tout moment."}
      </p>

      <form onSubmit={save} className="mt-8 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Nom complet</span>
          <input
            className="input"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setStatus({ kind: "idle" });
            }}
            autoComplete="name"
            placeholder="Ex : Yassine Benali"
            maxLength={80}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Téléphone (WhatsApp)</span>
          <input
            className={`input ${phoneInvalid ? "border-red-400 focus:border-red-500" : ""}`}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setStatus({ kind: "idle" });
            }}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="06 12 34 56 78"
            required
            aria-invalid={phoneInvalid}
            aria-describedby="phone-help"
          />
          <span id="phone-help" className={`mt-2 flex items-center gap-1.5 text-xs ${phoneInvalid ? "text-red-600" : "text-ink-muted"}`}>
            {phoneInvalid ? (
              "Numéro invalide. Ex : 06 12 34 56 78 ou +212 6 12 34 56 78"
            ) : (
              <>
                <LockIcon /> Privé : visible uniquement par toi et l&apos;équipe AJI TL3AB.
              </>
            )}
          </span>
        </label>

        <fieldset>
          <legend className="mb-2 block text-sm font-semibold">Poste préféré</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {POSITIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  setPosition(p.value);
                  setStatus({ kind: "idle" });
                }}
                aria-pressed={position === p.value}
                className={`chip ${position === p.value ? "chip-on" : "chip-off"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        {isNew && (
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              required
            />
            <span className="text-ink-muted">
              J&apos;accepte que AJI TL3AB conserve ces informations pour gérer mes matchs, conformément à la{" "}
              <Link href="/confidentialite" target="_blank" className="font-semibold text-primary hover:underline">
                politique de confidentialité
              </Link>{" "}
              (loi 09-08).
            </span>
          </label>
        )}

        <button type="submit" className="btn-primary w-full" disabled={!canSave}>
          {status.kind === "saving" ? "Enregistrement…" : isNew ? "Créer mon profil" : "Enregistrer"}
        </button>

        <div aria-live="polite">
          {status.kind === "saved" && (
            <p className="rounded-xl bg-highlight/40 px-4 py-3 text-sm font-semibold text-highlight-ink">
              ✔ Profil enregistré. Mrehba bik f AJI TL3AB !
            </p>
          )}
          {status.kind === "error" && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {status.message}
            </p>
          )}
        </div>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm">
        <span className="text-ink-muted">Connecté avec {user.email}</span>
        <button type="button" onClick={signOut} className="font-semibold text-primary hover:underline">
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
