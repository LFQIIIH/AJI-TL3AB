"use client";

import { useEffect, useState } from "react";
import { Check, Target } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/lazy";

type Challenge = { slot: number; title: string; target: number; points: number; progress: number; done: boolean };

/** "Défis du mois": 3 challenges with progress bars; bonus points when done. */
export default function ChallengesCard({ reloadKey = 0 }: { reloadKey?: number }) {
  const [items, setItems] = useState<Challenge[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabaseClient()
      .then((c) => c.rpc("my_challenges"))
      .then(({ data }) => !cancelled && setItems((data ?? []) as Challenge[]))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (!items?.length) return null;
  const done = items.filter((c) => c.done).length;
  const daysLeft = (() => {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  })();

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="defis">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            {done}/{items.length} réussis · encore {daysLeft} jour{daysLeft > 1 ? "s" : ""}
          </p>
          <h2 id="defis" className="headline mt-2 text-3xl sm:text-4xl">
            Défis du mois
          </h2>
        </div>
        <Target className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
      </div>
      <ul className="mt-5 space-y-4">
        {items.map((c) => {
          const pct = Math.round((Math.min(c.progress, c.target) / c.target) * 100);
          return (
            <li key={c.slot}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={`flex items-center gap-2 font-semibold ${c.done ? "text-primary" : ""}`}>
                  {c.done && <Check className="h-4 w-4" aria-hidden="true" />}
                  {c.title}
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${c.done ? "bg-highlight text-highlight-ink" : "bg-canvas-deep text-ink-muted"}`}>
                  +{c.points} pts
                </span>
              </div>
              <div
                className="mt-2 h-2.5 overflow-hidden rounded-full bg-canvas-deep"
                role="progressbar"
                aria-label={c.title}
                aria-valuemin={0}
                aria-valuemax={c.target}
                aria-valuenow={Math.min(c.progress, c.target)}
              >
                <div className={`h-full rounded-full transition-all duration-700 ${c.done ? "bg-highlight" : "bg-primary"}`} style={{ width: `${Math.max(pct, 3)}%` }} />
              </div>
              <p className="mt-1 text-xs text-ink-muted tabular-nums">
                {Math.min(c.progress, c.target)} / {c.target}
                {c.done ? " · réussi, bonus ajouté à tes points" : ""}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-ink-muted">Nouveaux défis le 1er de chaque mois. Seuls les matchs réservés avec ton compte comptent.</p>
    </section>
  );
}
