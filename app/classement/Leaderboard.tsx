"use client";

import Link from "next/link";
import { useState } from "react";
import { useRpc } from "@/components/community/useRpc";
import { AWARD_LABELS, currentMonthRange, currentSeasonRange, monthLabel, type AwardCategory } from "@/lib/community";
import { positionLabel, type Position } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Row = { category: AwardCategory; rank: number; name: string; player_position: Position; value: number; matches: number };

const ORDER: AwardCategory[] = ["buteur", "gardien", "defenseur", "milieu"];
const UNIT: Record<AwardCategory, [string, string]> = {
  buteur: ["but", "buts"],
  gardien: ["vote", "votes"],
  defenseur: ["vote", "votes"],
  milieu: ["vote", "votes"],
};

export default function Leaderboard() {
  const [period, setPeriod] = useState<"month" | "season">("month");
  const month = currentMonthRange();
  const season = currentSeasonRange();
  const range = period === "month" ? month : season;
  const rows = useRpc<Row>("leaderboard", { p_from: range.from, p_to: range.to, p_limit: 10 });

  if (!isSupabaseConfigured) {
    return <p className="card p-6 text-ink-muted">Le classement arrive bientôt.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2" role="tablist">
        {(
          [
            ["month", `Ce mois · ${monthLabel(month.month)}`],
            ["season", `Saison ${season.label}`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={period === value}
            onClick={() => setPeriod(value)}
            className={`chip ${period === value ? "chip-on" : "chip-off"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {ORDER.map((cat) => {
          const list = rows?.filter((r) => r.category === cat) ?? [];
          return (
            <section key={cat} className="card p-5 sm:p-6">
              <h2 className="headline text-3xl">{AWARD_LABELS[cat]}</h2>
              {rows === undefined ? (
                <div className="mt-4 h-24 animate-pulse rounded-xl bg-canvas-deep" />
              ) : list.length === 0 ? (
                <p className="mt-4 text-sm text-ink-muted">
                  Pas encore de {cat === "buteur" ? "buts" : "votes"} sur cette période.{" "}
                  <Link href="/jouer" className="font-semibold text-primary hover:underline">Joue un match →</Link>
                </p>
              ) : (
                <ol className="mt-4 divide-y divide-line">
                  {list.map((r, i) => (
                    <li key={r.name + i} className="flex items-center gap-3 py-2.5">
                      <span
                        className={`headline flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${
                          r.rank === 1 ? "bg-highlight text-highlight-ink" : "bg-canvas-deep text-ink-muted"
                        }`}
                      >
                        {r.rank}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{r.name}</span>
                        <span className="text-xs text-ink-muted">
                          {positionLabel(r.player_position)} · {r.matches} {r.matches > 1 ? "matchs" : "match"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="headline text-2xl">{r.value}</span>{" "}
                        <span className="text-xs text-ink-muted">{UNIT[cat][r.value > 1 ? 1 : 0]}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
