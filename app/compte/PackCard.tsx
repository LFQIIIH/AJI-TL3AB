"use client";

import { useCallback, useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { WhatsAppIcon } from "@/components/Icons";
import { PACK, packLastDay, packRequestLink, ticketsLine, type MyPack } from "@/lib/packs";
import { formatPhone } from "@/lib/profile";
import { supabaseClient } from "@/lib/supabase/lazy";
import { useSessionUser } from "@/lib/supabase/useSession";
import { PROFILE_SAVED_EVENT } from "./AccountPanel";
import { WALLET_CHANGED_EVENT } from "./WalletCard";

const DAY = 86_400_000;

/** The player's Pack Régulier: tickets left and expiry, or how to get one. */
export default function PackCard() {
  const user = useSessionUser();
  const [packs, setPacks] = useState<MyPack[] | null>(null);
  const [me, setMe] = useState<{ name: string; phone: string } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const client = await supabaseClient();
    const [k, p] = await Promise.all([
      client.rpc("my_packs"),
      client.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
    ]);
    if (k.error) return; // keep what we had
    setPacks((k.data ?? []) as MyPack[]);
    const prof = p.data as { full_name: string; phone: string } | null;
    setMe(prof ? { name: prof.full_name, phone: formatPhone(prof.phone) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload for another person, not on a session refresh
  }, [user?.id]);

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
  if (!user || packs === null || !me) return null;
  const live = packs.filter((k) => k.match_left + k.training_left > 0);

  if (live.length === 0) {
    return (
      <section aria-labelledby="mon-pack" className="card mb-4 flex items-start gap-3 p-5 text-sm">
        <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 id="mon-pack" className="font-semibold">
            {PACK.name} : {PACK.matches} matchs + {PACK.trainings} trainings
          </h2>
          <p className="mt-1 text-ink-muted">
            <span className="font-bold text-ink">{PACK.priceMad} MAD</span> au lieu de <s>{PACK.listPriceMad}</s>, valable {PACK.validDays} jours.
          </p>
          <a href={packRequestLink(me.name, me.phone)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:underline">
            <WhatsAppIcon className="h-4 w-4" /> Prendre le pack
          </a>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="mon-pack" className="card mb-4 border-2 border-primary p-6">
      <h2 id="mon-pack" className="eyebrow flex items-center gap-2">
        <Ticket className="h-4 w-4" aria-hidden="true" /> Mon pack
      </h2>
      {live.map((k) => {
        const days = Math.ceil((new Date(k.expires_at).getTime() - Date.now()) / DAY);
        return (
          <div key={k.id} className="mt-3">
            <p className="headline text-3xl">Pack : {ticketsLine(k.match_left, k.training_left)}</p>
            <p className={`mt-1 text-sm ${days <= 5 ? "font-semibold text-red-700" : "text-ink-muted"}`}>
              Valable jusqu&apos;au {packLastDay(k.expires_at)}
              {days <= 5 ? ` · plus que ${days} jour${days > 1 ? "s" : ""}` : ""}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-semibold">
              <Tickets label="Matchs" left={k.match_left} total={k.match_tickets} />
              <Tickets label="Trainings" left={k.training_left} total={k.training_tickets} />
            </div>
          </div>
        );
      })}
      <p className="mt-4 text-xs text-ink-muted">
        Utilisé automatiquement quand tu réserves un match {PACK.formats.join(" ou ")} ou un training. Annulation jusqu&apos;à 24 h avant : ticket
        rendu. Après : ticket perdu.
      </p>
    </section>
  );
}

function Tickets({ label, left, total }: { label: string; left: number; total: number }) {
  return (
    <div className="rounded-xl bg-canvas-deep px-3 py-2">
      <p className="text-ink-muted">{label}</p>
      <p className="mt-1 flex items-center justify-center gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${i < left ? "bg-primary" : "bg-line-strong"}`} />
        ))}
        <span className="ml-1 tabular-nums">
          {left}/{total}
        </span>
      </p>
    </div>
  );
}
