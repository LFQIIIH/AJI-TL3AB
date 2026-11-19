import AdminNav from "../AdminNav";
import { formatAdminDate, requireStaff } from "@/lib/admin";
import { clearErrors } from "./actions";

type ErrorRow = { id: number; created_at: string; source: "client" | "server"; message: string; url: string | null; detail: string | null; user_agent: string | null; user_id: string | null };

/** Errors seen by visitors and by the server over the last 30 days, grouped by message. */
export default async function AdminErrorsPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { supabase, role } = await requireStaff({ adminOnly: true });
  const { ok, erreur } = await searchParams;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await supabase.from("app_errors").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500);
  const rows = (data ?? []) as ErrorRow[];

  const groups = new Map<string, { first: ErrorRow; count: number; users: Set<string>; pages: Set<string> }>();
  for (const r of rows) {
    const key = `${r.source}|${r.message}`;
    const g = groups.get(key) ?? { first: r, count: 0, users: new Set<string>(), pages: new Set<string>() };
    g.count++;
    if (r.user_id) g.users.add(r.user_id);
    if (r.url) g.pages.add(r.url);
    groups.set(key, g);
  }
  const last24h = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 86400000).length;

  return (
    <>
      <AdminNav role={role} current="/admin/erreurs" title="Erreurs" ok={ok} erreur={erreur} />
      <p className="-mt-4 mb-6 max-w-2xl text-ink-muted">
        Les erreurs vues par les visiteurs (navigateur) et par le serveur (réservations, profils) ces 30 derniers jours.{" "}
        <strong className="text-ink">{last24h}</strong> dans les dernières 24 h. Envoie une capture de cette page si une erreur revient souvent.
      </p>
      {groups.size === 0 ? (
        <p className="card p-6 text-ink-muted">Aucune erreur ces 30 derniers jours. 👌</p>
      ) : (
        <>
          <ul className="space-y-3">
            {[...groups.values()].map(({ first, count, users, pages }) => (
              <li key={`${first.source}${first.message}`} className="card p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-0.5 font-bold ${first.source === "server" ? "bg-red-100 text-red-800" : "bg-canvas-deep text-ink"}`}>
                    {first.source === "server" ? "Serveur" : "Navigateur"}
                  </span>
                  <span className="font-bold">{count}×</span>
                  <span className="text-ink-muted">dernière : {formatAdminDate(first.created_at)}</span>
                  {users.size > 0 && <span className="text-ink-muted">· {users.size} joueur{users.size > 1 ? "s" : ""} connecté{users.size > 1 ? "s" : ""}</span>}
                </div>
                <p className="mt-2 break-words font-mono text-sm">{first.message}</p>
                {pages.size > 0 && <p className="mt-1 break-words text-xs text-ink-muted">Pages : {[...pages].slice(0, 5).join(", ")}</p>}
                {first.detail && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-semibold text-ink-muted">Détails techniques</summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-canvas-deep p-3">{first.detail}</pre>
                    {first.user_agent && <p className="mt-1 break-words text-ink-muted">{first.user_agent}</p>}
                  </details>
                )}
              </li>
            ))}
          </ul>
          <form action={clearErrors} className="mt-6">
            <button type="submit" className="btn-ghost">
              Tout effacer (erreurs réglées)
            </button>
          </form>
        </>
      )}
    </>
  );
}
