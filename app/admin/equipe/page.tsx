import { requireStaff } from "@/lib/admin";
import AdminNav from "../AdminNav";
import { setStaff } from "../actions";

type StaffRow = { user_id: string; email: string; full_name: string | null; role: "admin" | "captain" };

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { supabase, role, user } = await requireStaff({ adminOnly: true });
  const { ok, erreur } = await searchParams;
  const { data } = await supabase.rpc("admin_list_staff");
  const staff = (data ?? []) as StaffRow[];
  return (
    <>
      <AdminNav role={role} current="/admin/equipe" title="Équipe" ok={ok} erreur={erreur} />
      <p className="mb-6 max-w-2xl text-ink-muted">
        <strong className="text-ink">Admin</strong> : gère tout. <strong className="text-ink">Capitaine</strong> : voit uniquement ses
        matchs, la liste des joueurs avec leurs numéros, et saisit présence, buts et score.
      </p>

      <section aria-labelledby="ajouter">
        <h2 id="ajouter" className="headline text-3xl">
          Ajouter quelqu&apos;un
        </h2>
        <form action={setStaff} className="card mt-4 grid gap-4 p-6 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">E-mail de son compte AJI TL3AB</span>
            <input className="input" type="email" name="email" required autoComplete="off" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Rôle</span>
            <select className="input" name="role" defaultValue="captain">
              <option value="captain">Capitaine</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" className="btn-primary">
            Ajouter
          </button>
        </form>
        <p className="mt-2 text-xs text-ink-muted">La personne doit d&apos;abord avoir créé son compte sur le site.</p>
      </section>

      <section aria-labelledby="liste" className="mt-10">
        <h2 id="liste" className="headline text-3xl">
          Équipe ({staff.length})
        </h2>
        <ul className="mt-4 space-y-3">
          {staff.map((s) => (
            <li key={s.user_id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <span className="min-w-0">
                <span className="block font-semibold">
                  {s.full_name || s.email}
                  {s.user_id === user.id && <span className="ml-2 text-sm font-normal text-ink-muted">(toi)</span>}
                </span>
                <span className="block break-all text-sm text-ink-muted">{s.email}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-canvas-deep px-3 py-1 text-xs font-bold uppercase">{s.role === "admin" ? "Admin" : "Capitaine"}</span>
                <form action={setStaff}>
                  <input type="hidden" name="email" value={s.email} />
                  <input type="hidden" name="role" value="remove" />
                  <button type="submit" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-red-700 hover:underline">
                    Retirer
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
