"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { currentMonthRange, monthLabel } from "@/lib/community";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseClient } from "@/lib/supabase/lazy";
import { useRpc } from "./useRpc";

type Winner = { month: string; winner_name: string; entrants: number };

/** Monthly draw: rules, this month's pool and past winners. */
export default function DrawInfo({ compact = false }: { compact?: boolean }) {
  const { month } = currentMonthRange();
  const status = useRpc<{ entrants: number; tickets: number }>("draw_status", { p_month: month });
  const [winners, setWinners] = useState<Winner[] | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabaseClient()
      .then((c) => c.from("draws").select("month, winner_name, entrants").order("month", { ascending: false }).limit(compact ? 1 : 6))
      .then(({ data }) => setWinners((data ?? []) as Winner[]))
      .catch(() => setWinners([]));
  }, [compact]);

  const pool = status?.[0];
  const last = winners?.[0];

  return (
    <div className="rounded-2xl bg-forest p-6 text-white sm:p-8">
      <p className="eyebrow text-highlight">Tirage au sort · {monthLabel(month)}</p>
      <h3 className="headline mt-3 text-4xl sm:text-5xl">
        Un match <span className="text-highlight">gratuit</span> chaque mois
      </h3>
      <p className="mt-3 max-w-xl text-white/70">
        Chaque fin de mois, on tire au sort un joueur parmi ceux qui ont joué au moins un match dans le mois. Le gagnant joue son
        prochain match gratuitement.
      </p>

      {pool && (
        <p className="mt-5 text-lg">
          Déjà <span className="font-bold text-highlight">{pool.entrants}</span> {pool.entrants > 1 ? "joueurs" : "joueur"} dans le tirage de ce
          mois.
        </p>
      )}

      {!compact && (
        <ul className="mt-6 space-y-2 text-sm text-white/80">
          <li>✔ 1 ticket si tu joues au moins un match dans le mois (avec ton compte)</li>
          <li>✔ +1 ticket par pote inscrit avec ton lien qui joue aussi dans le mois</li>
          <li>✔ Tirage le 1er du mois suivant, le gagnant est affiché ici et contacté sur WhatsApp</li>
        </ul>
      )}

      {last && (
        <p className="mt-6 text-sm text-white/70">
          Dernier gagnant ({monthLabel(last.month)}) : <span className="font-bold text-highlight">{last.winner_name}</span> 🎉
        </p>
      )}
      {!compact && winners && winners.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {winners.slice(1).map((w) => (
            <li key={w.month} className="rounded-full bg-forest-light px-3 py-1">
              <span className="capitalize">{monthLabel(w.month)}</span> · {w.winner_name}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/jouer" className="btn bg-highlight text-highlight-ink hover:bg-highlight/90">
          Jouer ce mois-ci
        </Link>
        {compact && (
          <Link href="/classement#tirage" className="btn border border-forest-light text-white hover:border-white">
            Règles
          </Link>
        )}
      </div>
    </div>
  );
}
