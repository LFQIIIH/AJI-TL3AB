import Link from "next/link";
import { formatAdminDate, requireStaff, type AdminMatch } from "@/lib/admin";
import { MATCHES_SHEET_CSV_URL, MATCHES_SOURCE } from "@/lib/config";
import AdminNav from "./AdminNav";
import { importSheet } from "./actions";

type Search = Promise<{ ok?: string; erreur?: string; passes?: string }>;

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  published: { label: "Publié", className: "bg-highlight text-highlight-ink" },
  draft: { label: "Brouillon", className: "bg-canvas-deep text-ink-muted" },
  cancelled: { label: "Annulé", className: "bg-red-100 text-red-800" },
};

export default async function AdminMatchesPage({ searchParams }: { searchParams: Search }) {
  const { supabase, role } = await requireStaff();
  const { ok, erreur, passes } = await searchParams;
  const showPast = passes === "1";

  const since = new Date(Date.now() - (showPast ? 60 : 1) * 86400000).toISOString();
  const { data, error } = await supabase
    .from("matches")
    .select("*, pitches(name, area)")
    .gte("starts_at", since)
    .order("starts_at", { ascending: true })
    .limit(200);
  const matches = (data ?? []) as AdminMatch[];
  const { data: counts } = matches.length
    ? await supabase.rpc("match_booking_counts", { p_match_ids: matches.map((m) => m.id) })
    : { data: [] };
  const booked = new Map((counts as { match_id: string; booked: number; waiting: number }[] | null)?.map((c) => [c.match_id, c]) ?? []);
  const now = Date.now();
  const upcoming = matches.filter((m) => new Date(m.starts_at).getTime() > now);
  const past = matches.filter((m) => new Date(m.starts_at).getTime() <= now).reverse();

  const row = (m: AdminMatch) => {
    const c = booked.get(m.id);
    const taken = m.extra_spots + (c?.booked ?? 0);
    const badge = STATUS_BADGE[m.status];
    const played = m.home_score !== null && m.away_score !== null;
    return (
      <li key={m.id}>
        <Link href={`/admin/matchs/${encodeURIComponent(m.id)}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary">
          <span className="min-w-0">
            <span className="block font-semibold capitalize">{formatAdminDate(m.starts_at)}</span>
            <span className="block text-sm text-ink-muted">
              {m.pitches?.name ?? "?"} · {m.format} · {m.level} · {m.price_mad} MAD
            </span>
          </span>
          <span className="flex items-center gap-2 text-sm">
            {played && (
              <span className="font-bold">
                {m.home_score}–{m.away_score}
              </span>
            )}
            <span className="font-semibold">
              {taken}/{m.total_spots}
            </span>
            {(c?.waiting ?? 0) > 0 && <span className="text-ink-muted">+{c?.waiting} en attente</span>}
            {m.status === "published" && m.publish_at && new Date(m.publish_at).getTime() > now ? (
              <span className="rounded-full bg-canvas-deep px-2.5 py-1 text-xs font-bold text-ink-muted">Visible le {formatAdminDate(m.publish_at)}</span>
            ) : (
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>{badge.label}</span>
            )}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <AdminNav role={role} current="/admin" title="Matchs" ok={ok} erreur={erreur ?? (error ? "Impossible de charger les matchs." : undefined)} />

      {role === "admin" && (
        <div className="mb-8 flex flex-wrap gap-3">
          <Link href="/admin/matchs/nouveau" className="btn-primary">
            + Nouveau match
          </Link>
        </div>
      )}

      <section aria-labelledby="a-venir">
        <h2 id="a-venir" className="headline text-3xl">
          À venir ({upcoming.length})
        </h2>
        {upcoming.length ? (
          <ul className="mt-4 space-y-3">{upcoming.map(row)}</ul>
        ) : (
          <p className="mt-4 text-ink-muted">
            {role === "admin" ? "Aucun match à venir. Crée le premier avec « Nouveau match »." : "Aucun match à venir où tu es capitaine."}
          </p>
        )}
      </section>

      <section aria-labelledby="passes" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="passes" className="headline text-3xl">
            Joués {showPast ? "(60 derniers jours)" : "(dernières 24 h)"}
          </h2>
          <Link href={showPast ? "/admin" : "/admin?passes=1"} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
            {showPast ? "Masquer les anciens" : "Voir les 60 derniers jours"}
          </Link>
        </div>
        {past.length ? <ul className="mt-4 space-y-3">{past.map(row)}</ul> : <p className="mt-4 text-ink-muted">Aucun match joué sur cette période.</p>}
      </section>

      {role === "admin" && (
        <section aria-labelledby="import" className="card mt-12 p-6">
          <h2 id="import" className="headline text-3xl">
            Google Sheet → base de données
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Source actuelle du site : <strong className="text-ink">{MATCHES_SOURCE === "supabase" ? "base de données (cet espace admin)" : "Google Sheet"}</strong>.
          </p>
          {MATCHES_SHEET_CSV_URL ? (
            <>
              <p className="mt-2 text-sm text-ink-muted">
                Copie tous les matchs et résultats du Google Sheet ici, en gardant les réservations, votes et stats liés.
                À faire <strong className="text-ink">une seule fois</strong> : un nouvel import écrase les modifications faites ici sur les mêmes matchs.
              </p>
              <form action={importSheet} className="mt-4">
                <button type="submit" className="btn-ghost">
                  Importer le Google Sheet
                </button>
              </form>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Aucun Google Sheet configuré.</p>
          )}
        </section>
      )}
    </>
  );
}
