"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSessionUser } from "@/lib/supabase/useSession";
import {
  BIRTH_DATE_MAX,
  BIRTH_DATE_MIN,
  FEET,
  firstName,
  formatPhone,
  isProfileComplete,
  LEVELS,
  levelLabel,
  normalizePhone,
  POSITIONS,
  positionLabel,
  PROFILE_COLUMNS,
  type Foot,
  type Level,
  type Position,
  type Profile,
} from "@/lib/profile";
import { clearStoredReferral, readStoredReferral } from "@/lib/community";
import { saveProfile, type SaveProfileResult } from "./actions";
import Avatar from "@/components/Avatar";
import { AVATARS_BUCKET, avatarUrl, squareAvatar } from "@/lib/avatar";

/** Fired after a save so the dashboard reloads (e.g. right after profile creation). */
export const PROFILE_SAVED_EVENT = "ajitl3ab:profile-saved";

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export default function AccountPanel() {
  const router = useRouter();
  const user = useSessionUser();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [level, setLevel] = useState<Level | "">("");
  const [foot, setFoot] = useState<Foot | "">("");
  const [consent, setConsent] = useState(false);
  const [referral, setReferral] = useState("");
  const [avatarPath, setAvatarPath] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // A complete profile is shown as a short summary; the form opens on demand.
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || user === null) router.replace("/connexion");
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getSupabaseBrowserClient()
      .from("profiles")
      .select(PROFILE_COLUMNS)
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
        setBirthDate(data?.birth_date ?? "");
        setLevel(data?.level ?? "");
        setFoot(data?.preferred_foot ?? "");
        setAvatarPath(data?.avatar_path ?? "");
        // Older profiles: ask for the fields booking now needs.
        if (data && !isProfileComplete(data)) setEditing(true);
        if (!data) setReferral(readStoredReferral());
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only for another person, not on a session refresh
  }, [user?.id]);

  const isNew = profile === null;
  const normalizedPhone = normalizePhone(phone);
  const phoneInvalid = phone.trim() !== "" && normalizedPhone === null;
  const canSave =
    fullName.trim().length >= 2 &&
    normalizedPhone !== null &&
    position !== "" &&
    birthDate >= BIRTH_DATE_MIN &&
    birthDate <= BIRTH_DATE_MAX &&
    level !== "" &&
    avatarPath !== "" &&
    !avatarBusy &&
    (!isNew || consent) &&
    status.kind !== "saving";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canSave || !normalizedPhone) return;
    setStatus({ kind: "saving" });
    let result: SaveProfileResult;
    try {
      result = await saveProfile({
        fullName,
        phone,
        position,
        birthDate,
        level,
        foot,
        consent,
        referral: isNew ? referral : "",
        avatarPath,
      });
    } catch {
      setStatus({ kind: "error", message: "Pas de connexion internet. Vérifie ton réseau et réessaie." });
      return;
    }
    if ("error" in result) {
      setStatus({ kind: "error", message: result.error });
      return;
    }
    const data = result.profile;
    const previous = profile?.avatar_path;
    if (previous && previous !== data.avatar_path) {
      getSupabaseBrowserClient().storage.from(AVATARS_BUCKET).remove([previous]).catch(() => {});
    }
    setProfile(data);
    setPhone(formatPhone(data.phone));
    setStatus({ kind: "saved" });
    setEditing(false);
    if (isNew) clearStoredReferral();
    window.dispatchEvent(new Event(PROFILE_SAVED_EVENT));
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/");
  }

  if (!user || profile === undefined) {
    return (
      <div className="card w-full p-8 text-center text-ink-muted" aria-busy="true">
        {status.kind === "error" ? status.message : "Chargement…"}
      </div>
    );
  }

  function cancelEdit() {
    if (!profile) return;
    setFullName(profile.full_name);
    setPhone(formatPhone(profile.phone));
    setPosition(profile.position);
    setBirthDate(profile.birth_date ?? "");
    setLevel(profile.level ?? "");
    setFoot(profile.preferred_foot ?? "");
    setAvatarPath(profile.avatar_path ?? "");
    setStatus({ kind: "idle" });
    setEditing(false);
  }

  if (profile && !editing) {
    return (
      <div className="card w-full p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <Avatar name={profile.full_name} path={profile.avatar_path} size={72} className="ring-4 ring-highlight" />
          <div>
            <p className="eyebrow">Espace joueur</p>
            <h1 className="headline mt-2 text-5xl">
              Salam <span className="whitespace-nowrap">{firstName(profile.full_name)} 👋</span>
            </h1>
          </div>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-ink-muted">
          <span className="rounded-full bg-highlight px-3 py-1 text-sm font-bold text-highlight-ink">⚽ {positionLabel(profile.position)}</span>
          {profile.level && <span className="rounded-full bg-canvas-deep px-3 py-1 text-sm font-semibold text-ink">{levelLabel(profile.level)}</span>}
          Ton profil est prêt.
        </p>
        {status.kind === "saved" && (
          <p className="mt-4 rounded-xl bg-highlight/40 px-4 py-3 text-sm font-semibold text-highlight-ink" role="status">
            ✔ Profil enregistré. Mrehba bik f AJI TL3AB !
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm">
          <span className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost px-4 py-2">
              Modifier mes infos
            </button>
            <Link href="/compte/mot-de-passe" className="font-semibold text-primary hover:underline">
              Mot de passe
            </Link>
          </span>
          <button type="button" onClick={signOut} className="font-semibold text-ink-muted hover:text-ink hover:underline">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card w-full p-6 sm:p-8">
      <p className="eyebrow">Espace joueur</p>
      <h1 className="headline mt-3 text-5xl">{isNew ? "Crée ton profil" : "Mes infos"}</h1>
      <p className="mt-3 text-ink-muted">
        {isNew ? "Quelques infos et c'est bon. Ça prend 30 secondes." : "Modifie ce que tu veux puis enregistre."}
      </p>
      {profile && !isProfileComplete(profile) && (
        <p className="mt-4 rounded-xl bg-highlight/40 px-4 py-3 text-sm font-semibold text-highlight-ink" role="status">
          Pour pouvoir réserver, complète ton profil : photo, date de naissance et niveau. On s&apos;en sert pour équilibrer les matchs.
        </p>
      )}

      <form onSubmit={save} className="mt-8 space-y-5">
        <AvatarPicker
          userId={user.id}
          name={fullName || "?"}
          path={avatarPath}
          busy={avatarBusy}
          error={avatarError}
          onBusy={setAvatarBusy}
          onError={setAvatarError}
          onUploaded={(p) => {
            setAvatarPath(p);
            setStatus({ kind: "idle" });
          }}
        />
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
          <div className="grid grid-cols-2 gap-2">
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

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Date de naissance</span>
          <input
            className="input"
            type="date"
            value={birthDate}
            min={BIRTH_DATE_MIN}
            max={BIRTH_DATE_MAX}
            onChange={(e) => {
              setBirthDate(e.target.value);
              setStatus({ kind: "idle" });
            }}
            autoComplete="bday"
            required
          />
          <span className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
            <LockIcon /> Privé. Sert à faire des matchs entre joueurs du même âge.
          </span>
        </label>

        <fieldset>
          <legend className="mb-2 block text-sm font-semibold">Ton niveau</legend>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => {
                  setLevel(l.value);
                  setStatus({ kind: "idle" });
                }}
                aria-pressed={level === l.value}
                className={`chip px-2 ${level === l.value ? "chip-on" : "chip-off"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 block text-sm font-semibold">
            Pied préféré <span className="font-normal text-ink-muted">(optionnel)</span>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {FEET.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setFoot(foot === f.value ? "" : f.value);
                  setStatus({ kind: "idle" });
                }}
                aria-pressed={foot === f.value}
                className={`chip px-2 ${foot === f.value ? "chip-on" : "chip-off"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>

        {isNew && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Code d&apos;un pote <span className="font-normal text-ink-muted">(optionnel)</span>
            </span>
            <input
              className="input font-mono uppercase"
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              placeholder="Ex : K7M2QX"
              maxLength={12}
              autoCapitalize="characters"
            />
            <span className="mt-2 block text-xs text-ink-muted">Ton pote gagne un ticket pour le tirage au sort quand tu joues.</span>
          </label>
        )}

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
          {status.kind === "error" && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {status.message}
            </p>
          )}
        </div>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm">
        {isNew ? (
          <span />
        ) : (
          <button type="button" onClick={cancelEdit} className="font-semibold text-primary hover:underline">
            Annuler
          </button>
        )}
        <button type="button" onClick={signOut} className="font-semibold text-ink-muted hover:text-ink hover:underline">
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

/** Round photo picker: square crop + 400 px JPEG on the phone, uploaded to the player's own folder. */
function AvatarPicker({
  userId,
  name,
  path,
  busy,
  error,
  onBusy,
  onError,
  onUploaded,
}: {
  userId: string;
  name: string;
  path: string;
  busy: boolean;
  error: string;
  onBusy: (b: boolean) => void;
  onError: (e: string) => void;
  onUploaded: (path: string) => void;
}) {
  async function pick(file: File | undefined) {
    if (!file) return;
    onError("");
    onBusy(true);
    try {
      const blob = await squareAvatar(file);
      const newPath = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await getSupabaseBrowserClient().storage.from(AVATARS_BUCKET).upload(newPath, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      onUploaded(newPath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      onError(
        msg.includes("no_blob") || msg.includes("decode") || msg.includes("InvalidStateError") || msg === ""
          ? "Cette photo ne passe pas. Choisis une photo JPG ou PNG (ou fais une capture d'écran de ta photo)."
          : "L'envoi de la photo a échoué. Vérifie ta connexion et réessaie.",
      );
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <label className={`relative cursor-pointer rounded-full ${busy ? "opacity-60" : ""}`}>
        {path ? (
          // eslint-disable-next-line @next/next/no-img-element -- the photo just uploaded
          <img src={avatarUrl(path) ?? ""} alt="Toi" className="h-24 w-24 rounded-full object-cover ring-4 ring-highlight" />
        ) : (
          <span className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-dashed border-line-strong bg-canvas-deep text-ink-muted">
            <CameraIcon />
            <span className="mt-1 text-[11px] font-bold uppercase">Photo</span>
          </span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          disabled={busy}
          aria-label={path ? "Changer ta photo de profil" : "Ajouter ta photo de profil"}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </label>
      <div className="min-w-0 text-sm">
        <p className="font-semibold">
          Photo de profil <span className="text-red-700">*</span>
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          {busy
            ? "Envoi…"
            : path
              ? "Touche la photo pour la changer."
              : "Une photo de toi, visage visible. Elle s'affiche sur ton profil joueur et au classement."}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
        <span className="sr-only">{name}</span>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
