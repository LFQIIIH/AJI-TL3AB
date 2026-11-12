import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { formatMorocco } from "@/lib/morocco-time";
import { formatPhone, levelLabel, type Level } from "@/lib/profile";
import { METHOD_LABEL, signedMad, TX_LABEL, type WalletTx } from "@/lib/wallet";
import AdminNav from "../AdminNav";
import { setTrusted, walletAdd } from "../actions";

type Player = {
  user_id: string;
  full_name: string;
  phone: string;
  level: Level | null;
  trusted: boolean;
  balance: number;
  bookings: number;
  last_match: string | null;
};

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; joueur?: string; ok?: string; erreur?: string }>;
}) {
  const { supabase, role } = await requireStaff({ adminOnly: true });
  const { q = "", joueur, ok, erreur } = await searchParams;
  const { data } = await supabase.rpc("admin_players", { p_search: q });
  const players = (data ?? []) as Player[];
  const selected = joueur ? players.find((p) => p.user_id === joueur) : undefined;
  const { data: txData } = selected
    ? await supabase
        .from("wallet_transactions")
        .select("id, amount_mad, kind, method, match_id, note, created_at")
        .eq("user_id", selected.user_id)
        .order("id", { ascending: false })
        .limit(20)
    : { data: [] };
  const txs = (txData ?? []) as WalletTx[];
  const owed = players.filter((p) => p.balance < 0).reduce((n, p) => n - p.balance, 0);
  const link = (id?: string) => `/admin/joueurs?${new URLSearchParams({ ...(q ? { q } : {}), ...(id ? { joueur: id } : {}) })}`;

  return (
    <>
      <AdminNav role={role} current="/admin/joueurs" title="Joueurs" ok={ok} erreur={erreur} />

      <form className="flex flex-wrap gap-3" action="/admin/joueurs">
        <input className="input max-w-sm flex-1" name="q" defaultValue={q} placeholder="Nom ou téléphone (ex : 06 12…)" aria-label="Rechercher un joueur" />
        <button type="submit" className="btn-ghost">
          Rechercher
        </button>
      </form>
      <p className="mt-2 text-sm text-ink-muted">
        {players.length} joueur{players.length > 1 ? "s" : ""}
        {owed > 0 && <> · <span className="font-semibold text-red-700">{owed} MAD à encaisser</span> (soldes négatifs)</>}
      </p>

      {selected && (
        <section aria-labelledby="joueur" className="card mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="joueur" className="headline text-3xl">
                {selected.full_name}
              </h2>
              <p className="text-sm text-ink-muted">
                <a href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
                  {formatPhone(selected.phone)}
                </a>
                {selected.level ? ` · ${levelLabel(selected.level)}` : ""} · {selected.bookings} match{selected.bookings > 1 ? "s" : ""}
              </p>
            </div>
            <p className={`headline text-4xl ${selected.balance < 0 ? "text-red-700" : ""}`}>{selected.balance} MAD</p>
          </div>

          <form action={walletAdd} className="mt-5 grid gap-3 sm:grid-cols-[8rem_10rem_10rem_1fr_auto] sm:items-end">
            <input type="hidden" name="user_id" value={selected.user_id} />
            <input type="hidden" name="q" value={q} />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Montant</span>
              <input className="input" type="number" name="amount" min={1} max={100000} required placeholder="100" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Type</span>
              <select className="input" name="kind" defaultValue="recharge">
                <option value="recharge">Recharge (+)</option>
                <option value="correction">Correction (−)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Moyen</span>
              <select className="input" name="method" defaultValue="cash">
                <option value="cash">Cash</option>
                <option value="virement">Virement</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="autre">Autre</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Note (optionnel)</span>
              <input className="input" name="note" maxLength={200} placeholder="Ex : cash au terrain jeudi" />
            </label>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </form>

          <form action={setTrusted} className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm">
            <input type="hidden" name="user_id" value={selected.user_id} />
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="trusted" value={selected.trusted ? "0" : "1"} />
            <span className="text-ink-muted">
              {selected.trusted ? "Joueur de confiance : peut réserver sans solde et payer sur place." : "Doit avoir du solde pour réserver."}
            </span>
            <button type="submit" className="btn-ghost">
              {selected.trusted ? "Retirer la confiance" : "Marquer de confiance"}
            </button>
          </form>

          {txs.length > 0 && (
            <ul className="mt-5 divide-y divide-line border-t border-line text-sm">
              {txs.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="font-semibold">
                      {TX_LABEL[t.kind]}
                      {t.method ? ` · ${METHOD_LABEL[t.method] ?? t.method}` : ""}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {formatMorocco(t.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {t.note ? ` · ${t.note}` : ""}
                      {t.match_id ? ` · match ${t.match_id}` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 font-bold ${t.amount_mad > 0 ? "text-primary" : ""}`}>{signedMad(t.amount_mad)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ul className="mt-6 space-y-2">
        {players.map((p) => (
          <li key={p.user_id}>
            <Link
              href={link(p.user_id)}
              className={`card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary ${p.user_id === joueur ? "border-primary" : ""}`}
            >
              <span className="min-w-0">
                <span className="block font-semibold">
                  {p.full_name}
                  {p.trusted && <span className="ml-2 rounded-full bg-highlight px-2 py-0.5 text-xs text-highlight-ink">confiance</span>}
                </span>
                <span className="block text-sm text-ink-muted">
                  {formatPhone(p.phone)} · {p.bookings} match{p.bookings > 1 ? "s" : ""}
                </span>
              </span>
              <span className={`font-bold ${p.balance < 0 ? "text-red-700" : ""}`}>{p.balance} MAD</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
