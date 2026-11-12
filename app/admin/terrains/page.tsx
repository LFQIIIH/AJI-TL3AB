import { requireStaff, type Pitch } from "@/lib/admin";
import AdminNav from "../AdminNav";
import { savePitch } from "../actions";

function PitchFields({ pitch }: { pitch?: Pitch }) {
  return (
    <>
      {pitch && <input type="hidden" name="id" value={pitch.id} />}
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Nom</span>
        <input className="input" name="name" required minLength={2} maxLength={80} defaultValue={pitch?.name} placeholder="Ex : Urban Foot" />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Quartier</span>
        <input className="input" name="area" maxLength={80} defaultValue={pitch?.area} placeholder="Ex : Guéliz" />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Adresse</span>
        <input className="input" name="address" maxLength={200} defaultValue={pitch?.address} />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Lien Google Maps</span>
        <input className="input" name="maps_url" type="url" defaultValue={pitch?.maps_url ?? ""} placeholder="https://maps.app.goo.gl/…" />
      </label>
    </>
  );
}

export default async function PitchesPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { supabase, role } = await requireStaff({ adminOnly: true });
  const { ok, erreur } = await searchParams;
  const { data } = await supabase.from("pitches").select("*").order("active", { ascending: false }).order("name");
  const pitches = (data ?? []) as Pitch[];
  return (
    <>
      <AdminNav role={role} current="/admin/terrains" title="Terrains" ok={ok} erreur={erreur} />

      <section aria-labelledby="ajouter">
        <h2 id="ajouter" className="headline text-3xl">
          Ajouter un terrain
        </h2>
        <form action={savePitch} className="card mt-4 grid gap-4 p-6 sm:grid-cols-2">
          <PitchFields />
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Ajouter
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="liste" className="mt-10">
        <h2 id="liste" className="headline text-3xl">
          Terrains ({pitches.length})
        </h2>
        <ul className="mt-4 space-y-4">
          {pitches.map((p) => (
            <li key={p.id}>
              <details className="card p-5">
                <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold">
                    {p.name}
                    {p.area && <span className="font-normal text-ink-muted"> · {p.area}</span>}
                  </span>
                  <span className="text-sm text-ink-muted">{p.active ? "Actif" : "Masqué"} · modifier ▾</span>
                </summary>
                <form action={savePitch} className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                  <PitchFields pitch={p} />
                  <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold sm:col-span-2">
                    <input type="checkbox" name="active" defaultChecked={p.active} className="h-5 w-5 accent-primary" />
                    Actif (proposé dans les nouveaux matchs)
                  </label>
                  <div className="sm:col-span-2">
                    <button type="submit" className="btn-ghost">
                      Enregistrer
                    </button>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
