import { CATEGORIES, FORMATS, LEVELS, STATUSES, type AdminMatch, type Pitch } from "@/lib/admin";
import { marrakechParts } from "@/lib/matches";

type StaffOption = { user_id: string; full_name: string | null; email: string; role: string };

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

/** Create / edit a match (admin). `match` = edit mode. */
export default function MatchForm({
  action,
  match,
  pitches,
  staff,
  submitLabel,
}: {
  action: (f: FormData) => Promise<void>;
  match?: AdminMatch;
  pitches: Pitch[];
  staff: StaffOption[];
  submitLabel: string;
}) {
  const when = match ? marrakechParts(match.starts_at) : { date: "", time: "20:00" };
  const pub = match?.publish_at ? marrakechParts(match.publish_at) : { date: "", time: "" };
  const usable = pitches.filter((p) => p.active || p.id === match?.pitch_id);
  return (
    <form action={action} className="card grid gap-5 p-6 sm:grid-cols-2">
      {match && <input type="hidden" name="id" value={match.id} />}
      <Field label="Date">
        <input className="input" type="date" name="date" required defaultValue={when.date} />
      </Field>
      <Field label="Heure (Marrakech)">
        <input className="input" type="time" name="time" required step={300} defaultValue={when.time} />
      </Field>
      <Field label="Terrain" hint={usable.length ? undefined : "Ajoute d'abord un terrain dans l'onglet Terrains."}>
        <select className="input" name="pitch_id" required defaultValue={match?.pitch_id ?? ""}>
          <option value="" disabled>
            Choisir…
          </option>
          {usable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.area ? ` · ${p.area}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Format">
        <select className="input" name="format" defaultValue={match?.format ?? "5v5"}>
          {FORMATS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </Field>
      <Field label="Niveau">
        <select className="input" name="level" defaultValue={match?.level ?? "Tous niveaux"}>
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Catégorie">
        <select className="input" name="category" defaultValue={match?.category ?? "mixte"}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Prix par joueur (MAD)">
        <input className="input" type="number" name="price_mad" min={0} max={2000} required defaultValue={match?.price_mad ?? 50} />
      </Field>
      <Field label="Places au total">
        <input className="input" type="number" name="total_spots" min={2} max={40} required defaultValue={match?.total_spots ?? 10} />
      </Field>
      <Field label="Places prises hors site" hint="Joueurs inscrits par WhatsApp ou sur place (les réservations en ligne s'ajoutent toutes seules).">
        <input className="input" type="number" name="extra_spots" min={0} max={40} defaultValue={match?.extra_spots ?? 0} />
      </Field>
      <Field label="Statut">
        <select className="input" name="status" defaultValue={match?.status ?? "published"}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Publier le (optionnel)" hint="Vide = visible tout de suite. Sinon le match reste caché (et non réservable) jusqu'à cette date ; /jouer affiche un compte à rebours.">
        <input className="input" type="date" name="publish_date" defaultValue={pub.date} />
      </Field>
      <Field label="Publier à (heure)">
        <input className="input" type="time" name="publish_time" step={300} defaultValue={pub.time} />
      </Field>
      <Field label="Capitaine" hint={staff.length ? undefined : "Ajoute des capitaines dans l'onglet Équipe."}>
        <select className="input" name="captain_id" defaultValue={match?.captain_id ?? ""}>
          <option value="">Aucun</option>
          {staff.map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.full_name || s.email} ({s.role === "admin" ? "admin" : "capitaine"})
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes internes (jamais affichées sur le site)">
          <textarea className="input min-h-24" name="notes" maxLength={1000} defaultValue={match?.notes ?? ""} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary w-full sm:w-auto">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
