"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRpc } from "@/components/community/useRpc";
import { currentMonthRange, monthLabel } from "@/lib/community";
import { playerPath, POINTS, tierFor, TIERS } from "@/lib/points";
import { positionLabel, type Position } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { publicRpc } from "@/lib/supabase/publicApi";

export type PointsRow = {
  rank: number;
  name: string;
  code: string | null;
  player_position: Position | null;
  points: number;
  matches: number;
  goals: number;
  assists: number;
};
type Found = { code: string; name: string; player_position: Position | null; matches: number };

/** This month's points ranking (with tiers), player search, and how points work. */
export default function PointsRanking({ initial }: { initial?: PointsRow[] }) {
  const month = currentMonthRange().month;
  const rows = useRpc<PointsRow>("points_leaderboard", { p_month: month, p_limit: 20 }, true, initial);

  if (!isSupabaseConfigured) return null;

  return (
    <section aria-labelledby="points">
      <h2 id="points" className="headline text-4xl">
        Points · {monthLabel(month)}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">Remis à zéro le 1er de chaque mois. Les points de tous les mois font monter ton niveau.</p>

      {rows === undefined ? (
        <p className="mt-4 text-ink-muted">Chargement…</p>
      ) : rows?.length ? (
        <ol className="mt-4 space-y-2">
          {rows.map((r) => {
            const tier = tierFor(r.points);
            const inner = (
              <>
                <span className="headline w-8 shrink-0 text-2xl text-ink-muted">{r.rank}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block text-xs text-ink-muted">
                    {r.matches} match{r.matches > 1 ? "s" : ""}
                    {r.goals ? ` · ${r.goals} but${r.goals > 1 ? "s" : ""}` : ""}
                    {r.assists ? ` · ${r.assists} passe${r.assists > 1 ? "s" : ""}` : ""}
                    {r.player_position ? ` · ${positionLabel(r.player_position)}` : ""}
                  </span>
                </span>
                {tier && (
                  <span className="shrink-0 text-lg" title={tier.label}>
                    <span aria-hidden="true">{tier.icon}</span>
                    <span className="sr-only">{tier.label}</span>
                  </span>
                )}
                <span className="headline shrink-0 text-2xl">{r.points}</span>
              </>
            );
            return (
              <li key={`${r.rank}-${r.name}`}>
                {r.code ? (
                  <Link href={playerPath(r.code)} className="card flex items-center gap-3 p-3 transition hover:border-primary">
                    {inner}
                    <span className="sr-only">: voir le profil</span>
                  </Link>
                ) : (
                  <div className="card flex items-center gap-3 p-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      ) : rows === null ? (
        <p className="mt-4 text-ink-muted">Classement indisponible pour l&apos;instant.</p>
      ) : (
        <p className="mt-4 text-ink-muted">Personne n&apos;a encore joué ce mois-ci. Le premier match te met en tête !</p>
      )}

      <PlayerSearch />

      <details className="card mt-6 p-5">
        <summary className="cursor-pointer font-semibold">Comment gagner des points ?</summary>
        <ul className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {POINTS.map((p) => (
            <li key={p.key} className="flex justify-between gap-3 border-b border-line py-1.5">
              <span>{p.label}</span>
              <span className={`font-bold tabular-nums ${p.value < 0 ? "text-red-700" : "text-primary"}`}>
                {p.value > 0 ? "+" : ""}
                {p.value}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-semibold">Paliers du mois</p>
        <p className="mt-1 flex flex-wrap gap-3 text-sm text-ink-muted">
          {[...TIERS].reverse().map((t) => (
            <span key={t.id}>
              <span aria-hidden="true">{t.icon}</span> {t.label} : {t.min} pts
            </span>
          ))}
        </p>
        <p className="mt-3 text-xs text-ink-muted">Victoires et cartons comptent quand le capitaine les saisit pendant le match.</p>
      </details>
    </section>
  );
}

function PlayerSearch() {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[] | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return setFound(null);
    let cancelled = false;
    const t = setTimeout(() => {
      publicRpc<Found>("search_players", { p_query: query })
        .then((r) => !cancelled && setFound(r))
        .catch(() => !cancelled && setFound([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="mt-6">
      <label htmlFor="cherche-joueur" className="mb-2 block text-sm font-semibold">
        Chercher un joueur
      </label>
      <input id="cherche-joueur" type="search" className="input" placeholder="Prénom, ex : Yassine" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      {found && (
        <ul className="mt-2 space-y-1" aria-live="polite">
          {found.length ? (
            found.map((f) => (
              <li key={f.code}>
                <Link href={playerPath(f.code)} className="flex min-h-11 items-center justify-between rounded-xl px-3 hover:bg-canvas-deep">
                  <span className="font-semibold">{f.name}</span>
                  <span className="text-sm text-ink-muted">
                    {f.matches} match{f.matches > 1 ? "s" : ""}
                    {f.player_position ? ` · ${positionLabel(f.player_position)}` : ""}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-ink-muted">Aucun joueur trouvé.</li>
          )}
        </ul>
      )}
    </div>
  );
}
