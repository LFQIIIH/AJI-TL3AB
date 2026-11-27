import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { formatMorocco } from "@/lib/morocco-time";
import { formatPhone, levelLabel, type Level } from "@/lib/profile";
import { METHOD_LABEL, signedMad, TX_LABEL, type WalletTx } from "@/lib/wallet";
import AdminNav from "../AdminNav";
import { activatePack, cancelPack, removeAvatar, setTrusted, walletAdd } from "../actions";
import { PACK, packLastDay, ticketsLine, type AdminPack } from "@/lib/packs";
import Avatar from "@/components/Avatar";

type Player = {
  user_id: string;
  full_name: string;
  phone: string;
  level: Level | null;
  trusted: boolean;
  balance: number;
  bookings: number;
  last_match: string | null;
  avatar: string | null;
};

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    joueur?: string;
    ok?: string;
    erreur?: string;
  }>;
}) {
  const { supabase, role } = await requireStaff({ adminOnly: true });
  const { q = "", joueur, ok, erreur } = await searchParams;
  const { data } = await supabase.rpc("admin_players", { p_search: q });
  const players = (data ?? []) as Player[];
  const selected = joueur
    ? players.find((p) => p.user_id === joueur)
    : undefined;
  const { data: txData } = selected
    ? await supabase
        .from("wallet_transactions")
        .select("id, amount_mad, kind, method, match_id, note, created_at")
        .eq("user_id", selected.user_id)
        .order("id", { ascending: false })
        .limit(20)
    : { data: [] };
  const txs = (txData ?? []) as WalletTx[];
  const { data: packData } = selected
    ? await supabase.rpc("admin_packs", { p_user: selected.user_id, p_limit: 5 })
    : { data: [] };
  const packs = (packData ?? []) as AdminPack[];
  const now = Date.now();
  const running = packs.filter((k) => !k.cancelled_at && new Date(k.expires_at).getTime() > now);
  const owed = players
    .filter((p) => p.balance < 0)
    .reduce((n, p) => n - p.balance, 0);
  const link = (id?: string) =>
    `/admin/joueurs?${new URLSearchParams({ ...(q ? { q } : {}), ...(id ? { joueur: id } : {}) })}`;

  return (
    <>
      <AdminNav
        role={role}
        current="/admin/joueurs"
        title="Joueurs"
        ok={ok}
        erreur={erreur}
      />

      <form className="flex flex-wrap gap-3" action="/admin/joueurs">
        <input
          className="input max-w-sm flex-1"
          name="q"
          defaultValue={q}
          placeholder="Nom ou téléphone (ex : 06 12…)"
          aria-label="Rechercher un joueur"
        />
        <button type="submit" className="btn-ghost">
          Rechercher
        </button>
      </form>
      <p className="mt-2 text-sm text-ink-muted">
        {players.length} joueur{players.length > 1 ? "s" : ""}
        {owed > 0 && (
          <>
            {" "}
            ·{" "}
            <span className="font-semibold text-red-700">
              {owed} MAD à encaisser
            </span>{" "}
            (soldes négatifs)
          </>
        )}
      </p>

      {selected && (
        <section aria-labelledby="joueur" className="card mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <Avatar
                name={selected.full_name}
                path={selected.avatar}
                size={64}
              />
              <div>
                <h2 id="joueur" className="headline text-3xl">
                  {selected.full_name}
                </h2>
                <p className="text-sm text-ink-muted">
                  <a
                    href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline"
                  >
                    {formatPhone(selected.phone)}
                  </a>
                  {selected.level ? ` · ${levelLabel(selected.level)}` : ""} ·{" "}
                  {selected.bookings} match{selected.bookings > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <p
              className={`headline text-4xl ${selected.balance < 0 ? "text-red-700" : ""}`}
            >
              {selected.balance} MAD
            </p>
          </div>

          <form
            action={walletAdd}
            className="mt-5 grid gap-3 sm:grid-cols-[8rem_10rem_10rem_1fr_auto] sm:items-end"
          >
            <input type="hidden" name="user_id" value={selected.user_id} />
            <input type="hidden" name="q" value={q} />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Montant</span>
              <input
                className="input"
                type="number"
                name="amount"
                min={1}
                max={100000}
                required
                placeholder="100"
              />
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
              <span className="mb-2 block text-sm font-semibold">
                Note (optionnel)
              </span>
              <input
                className="input"
                name="note"
                maxLength={200}
                placeholder="Ex : cash au terrain jeudi"
              />
            </label>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </form>

          <div className="mt-4 border-t border-line pt-4 text-sm">
            <p className="font-semibold">{PACK.name}</p>
            {running.map((k) => (
              <form key={k.id} action={cancelPack} className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas-deep px-4 py-3">
                <input type="hidden" name="user_id" value={selected.user_id} />
                <input type="hidden" name="q" value={q} />
                <input type="hidden" name="pack_id" value={k.id} />
                <span>
                  Reste <span className="font-bold">{ticketsLine(k.match_tickets - k.match_used, k.training_tickets - k.training_used)}</span> · valable
                  jusqu&apos;au {packLastDay(k.expires_at)}
                </span>
                <button type="submit" className="text-xs font-semibold text-ink-muted hover:text-red-700 hover:underline">
                  Annuler (erreur)
                </button>
              </form>
            ))}
            <form action={activatePack} className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="user_id" value={selected.user_id} />
              <input type="hidden" name="q" value={q} />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Payé en</span>
                <select className="input" name="method" defaultValue="cash">
                  <option value="cash">Cash</option>
                  <option value="virement">Virement</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="autre">Autre</option>
                </select>
              </label>
              <label className="block min-w-40 flex-1">
                <span className="mb-2 block text-sm font-semibold">Note (optionnel)</span>
                <input className="input" name="note" maxLength={200} placeholder="Ex : cash au terrain" />
              </label>
              <button type="submit" className="btn-primary">
                Activer un pack ({PACK.priceMad} MAD)
              </button>
            </form>
            <p className="mt-2 text-xs text-ink-muted">
              {PACK.matches} matchs ({PACK.formats.join(" ou ")}) + {PACK.trainings} trainings, valable {PACK.validDays} jours. N&apos;ajoute rien au
              portefeuille : encaisse le paiement avant d&apos;activer.
            </p>
          </div>

          <form
            action={setTrusted}
            className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm"
          >
            <input type="hidden" name="user_id" value={selected.user_id} />
            <input type="hidden" name="q" value={q} />
            <input
              type="hidden"
              name="trusted"
              value={selected.trusted ? "0" : "1"}
            />
            <span className="text-ink-muted">
              {selected.trusted
                ? "Joueur de confiance : peut réserver sans solde et payer sur place."
                : "Doit avoir du solde pour réserver."}
            </span>
            <button type="submit" className="btn-ghost">
              {selected.trusted
                ? "Retirer la confiance"
                : "Marquer de confiance"}
            </button>
          </form>

          {selected.avatar && (
            <form
              action={removeAvatar}
              className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm"
            >
              <input type="hidden" name="user_id" value={selected.user_id} />
              <input type="hidden" name="q" value={q} />
              <span className="text-ink-muted">
                Photo inappropriée ou pas la bonne personne ? Le joueur devra en
                remettre une avant de réserver.
              </span>
              <button
                type="submit"
                className="btn border border-red-300 bg-surface text-red-700 hover:border-red-600"
              >
                Retirer la photo
              </button>
            </form>
          )}

          {txs.length > 0 && (
            <ul className="mt-5 divide-y divide-line border-t border-line text-sm">
              {txs.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="font-semibold">
                      {TX_LABEL[t.kind]}
                      {t.method
                        ? ` · ${METHOD_LABEL[t.method] ?? t.method}`
                        : ""}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {formatMorocco(t.created_at, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {t.note ? ` · ${t.note}` : ""}
                      {t.match_id ? ` · match ${t.match_id}` : ""}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-bold ${t.amount_mad > 0 ? "text-primary" : ""}`}
                  >
                    {signedMad(t.amount_mad)}
                  </span>
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
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={p.full_name} path={p.avatar} size={40} />
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {p.full_name}
                    {p.trusted && (
                      <span className="ml-2 rounded-full bg-highlight px-2 py-0.5 text-xs text-highlight-ink">
                        confiance
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-ink-muted">
                    {formatPhone(p.phone)} · {p.bookings} match
                    {p.bookings > 1 ? "s" : ""}
                    {!p.avatar && " · sans photo"}
                  </span>
                </span>
              </span>
              <span
                className={`font-bold ${p.balance < 0 ? "text-red-700" : ""}`}
              >
                {p.balance} MAD
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
