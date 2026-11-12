"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/Icons";
import { formatMorocco } from "@/lib/morocco-time";
import { formatPhone } from "@/lib/profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSessionUser } from "@/lib/supabase/useSession";
import { METHOD_LABEL, signedMad, topupLink, TOPUP_AMOUNTS, TX_LABEL, type WalletTx } from "@/lib/wallet";
import { PROFILE_SAVED_EVENT } from "./AccountPanel";

/** Fired after a booking / cancellation so the balance reloads. */
export const WALLET_CHANGED_EVENT = "ajitl3ab:wallet-changed";

type Wallet = { balance: number; trusted: boolean };

/** Prepaid balance, history and how to top up. */
export default function WalletCard() {
  const user = useSessionUser();
  const [wallet, setWallet] = useState<Wallet | null | undefined>(undefined);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [me, setMe] = useState<{ name: string; phone: string } | null>(null);
  const [amount, setAmount] = useState(TOPUP_AMOUNTS[1]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const client = getSupabaseBrowserClient();
    const [w, t, p] = await Promise.all([
      client.rpc("my_wallet"),
      client.from("wallet_transactions").select("id, amount_mad, kind, method, match_id, note, created_at").order("id", { ascending: false }).limit(10),
      client.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
    ]);
    const row = (w.data as Wallet[] | null)?.[0];
    setWallet(row ?? null);
    setTxs((t.data ?? []) as WalletTx[]);
    const prof = p.data as { full_name: string; phone: string } | null;
    setMe(prof ? { name: prof.full_name, phone: formatPhone(prof.phone) } : null);
  }, [user]);

  useEffect(() => {
    load();
    const reload = () => load();
    window.addEventListener(WALLET_CHANGED_EVENT, reload);
    window.addEventListener(PROFILE_SAVED_EVENT, reload);
    return () => {
      window.removeEventListener(WALLET_CHANGED_EVENT, reload);
      window.removeEventListener(PROFILE_SAVED_EVENT, reload);
    };
  }, [load]);

  // No profile yet: the profile form comes first.
  if (!user || wallet === undefined || wallet === null) return null;

  return (
    <section aria-labelledby="portefeuille" className="card mb-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="portefeuille" className="eyebrow">
            Mon portefeuille
          </h2>
          <p className={`headline mt-2 text-5xl ${wallet.balance < 0 ? "text-red-700" : ""}`}>{wallet.balance} MAD</p>
          {wallet.trusted && <p className="mt-1 text-xs font-semibold text-primary">Joueur de confiance : tu peux réserver et payer sur place.</p>}
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className="btn-primary px-4" aria-expanded={open}>
          Recharger
        </button>
      </div>

      {open && (
        <div className="mt-5 space-y-3 rounded-xl bg-canvas-deep p-4 text-sm">
          <p className="font-semibold">Combien ?</p>
          <div className="flex flex-wrap gap-2">
            {TOPUP_AMOUNTS.map((a) => (
              <button key={a} type="button" onClick={() => setAmount(a)} aria-pressed={amount === a} className={`chip ${amount === a ? "chip-on" : "chip-off"}`}>
                {a} MAD
              </button>
            ))}
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-ink-muted">
            <li>Envoie-nous la demande sur WhatsApp (bouton ci-dessous).</li>
            <li>Paie par virement (on t&apos;envoie le RIB) ou en cash au terrain, au capitaine ou à l&apos;équipe.</li>
            <li>Ton solde est crédité dès réception du paiement.</li>
          </ol>
          {me && (
            <a href={topupLink(amount, me.name, me.phone)} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
              <WhatsAppIcon /> Demander {amount} MAD sur WhatsApp
            </a>
          )}
        </div>
      )}

      {txs.length > 0 && (
        <details className="mt-5 border-t border-line pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Historique <span aria-hidden="true">▾</span>
          </summary>
          <ul className="mt-2 divide-y divide-line text-sm">
            {txs.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {TX_LABEL[t.kind]}
                    {t.method ? ` · ${METHOD_LABEL[t.method] ?? t.method}` : ""}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {formatMorocco(t.created_at, { day: "numeric", month: "short" })}
                    {t.note ? ` · ${t.note}` : ""}
                  </span>
                </span>
                <span className={`shrink-0 font-bold ${t.amount_mad > 0 ? "text-primary" : "text-ink"}`}>{signedMad(t.amount_mad)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-4 text-xs text-ink-muted">
        Annulation : 100 % remboursé jusqu&apos;à 24 h avant le match, 50 % après.{" "}
        <Link href="/regles" className="font-semibold text-primary hover:underline">
          Règlement
        </Link>
      </p>
    </section>
  );
}
