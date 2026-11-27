import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { formatMorocco } from "@/lib/morocco-time";
import { PACK, packLastDay, type AdminPack } from "@/lib/packs";
import { formatPhone } from "@/lib/profile";
import { METHOD_LABEL } from "@/lib/wallet";
import AdminNav from "../AdminNav";
import { cancelPack } from "../actions";


const monthKey = (iso: string) => formatMorocco(iso, { month: "long", year: "numeric" });

export default async function PacksPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { supabase, role } = await requireStaff({ adminOnly: true });
  const { ok, erreur } = await searchParams;
  const { data } = await supabase.rpc("admin_packs", { p_user: null, p_limit: 300 });
  const packs = (data ?? []) as AdminPack[];
  const now = Date.now();
  const status = (k: AdminPack) =>
    k.cancelled_at
      ? "Annulé"
      : new Date(k.expires_at).getTime() <= now
        ? "Expiré"
        : k.match_used >= k.match_tickets && k.training_used >= k.training_tickets
          ? "Terminé"
          : "En cours";

  // Sales per month (cancelled packs not counted).
  const months = new Map<string, { count: number; mad: number }>();
  for (const k of packs) {
    if (k.cancelled_at) continue;
    const key = monthKey(k.created_at);
    const m = months.get(key) ?? { count: 0, mad: 0 };
    months.set(key, { count: m.count + 1, mad: m.mad + k.price_mad });
  }
  const active = packs.filter((k) => status(k) === "En cours").length;

  return (
    <>
      <AdminNav role={role} current="/admin/packs" title="Packs" ok={ok} erreur={erreur} />

      <p className="text-sm text-ink-muted">
        {PACK.name} : {PACK.matches} matchs ({PACK.formats.join(" / ")}) + {PACK.trainings} trainings, {PACK.priceMad} MAD, {PACK.validDays} jours. Pour
        en vendre un : <Link href="/admin/joueurs" className="font-semibold text-primary hover:underline">Joueurs</Link> → le joueur → « Activer un pack ».
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-ink-muted">Packs en cours</p>
          <p className="headline text-4xl">{active}</p>
        </div>
        {[...months.entries()].slice(0, 2).map(([month, m]) => (
          <div key={month} className="card p-4">
            <p className="text-sm capitalize text-ink-muted">{month}</p>
            <p className="headline text-4xl">{m.mad} MAD</p>
            <p className="text-sm text-ink-muted">
              {m.count} pack{m.count > 1 ? "s" : ""} vendu{m.count > 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>

      {packs.length === 0 ? (
        <p className="card mt-6 p-6 text-center text-ink-muted">Aucun pack vendu pour l&apos;instant.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {packs.map((k) => {
            const st = status(k);
            return (
              <li key={k.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span className="min-w-0">
                  <Link href={`/admin/joueurs?joueur=${k.user_id}`} className="font-semibold hover:text-primary hover:underline">
                    {k.full_name}
                  </Link>
                  <span className="block text-ink-muted">
                    {formatPhone(k.phone)} · vendu le {formatMorocco(k.created_at, { day: "numeric", month: "short" })}
                    {k.method ? ` · ${METHOD_LABEL[k.method] ?? k.method}` : ""}
                    {k.sold_by ? ` · par ${k.sold_by}` : ""}
                    {k.note ? ` · ${k.note}` : ""}
                  </span>
                  <span className="block text-ink-muted">
                    Matchs {k.match_used}/{k.match_tickets} · Trainings {k.training_used}/{k.training_tickets} · jusqu&apos;au {packLastDay(k.expires_at)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${st === "En cours" ? "bg-highlight text-highlight-ink" : st === "Annulé" ? "bg-red-100 text-red-800" : "bg-canvas-deep"}`}
                  >
                    {st}
                  </span>
                  <span className={`font-bold ${k.cancelled_at ? "text-ink-muted line-through" : ""}`}>{k.price_mad} MAD</span>
                  {st === "En cours" && (
                    <form action={cancelPack}>
                      <input type="hidden" name="pack_id" value={k.id} />
                      <button type="submit" className="text-xs font-semibold text-ink-muted hover:text-red-700 hover:underline">
                        Annuler
                      </button>
                    </form>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
