"use client";

import { currentMonthRange, monthLabel } from "@/lib/community";
import { positionLabel, type Position } from "@/lib/profile";
import { useRpc } from "./useRpc";

type Row = { name: string; player_position: Position; votes: number; goals: number };

/** The 5 most-voted players of the month. Renders nothing until there are votes. */
export default function TeamOfMonth({ dark = false }: { dark?: boolean }) {
  const { month } = currentMonthRange();
  const rows = useRpc<Row>("team_of_month", { p_month: month });
  if (!rows?.length) return null;

  return (
    <div className={`rounded-2xl p-5 sm:p-6 ${dark ? "bg-forest text-white" : "card"}`}>
      <p className={`eyebrow ${dark ? "text-highlight" : ""}`}>Équipe du mois · {monthLabel(month)}</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-5">
        {rows.map((r, i) => (
          <li key={r.name + i} className={`rounded-xl p-4 text-center ${dark ? "bg-forest-light" : "bg-canvas-deep"}`}>
            <span className={`headline text-2xl ${dark ? "text-highlight" : "text-primary"}`}>#{i + 1}</span>
            <p className="headline mt-1 text-2xl">{r.name}</p>
            <p className={`text-xs font-semibold uppercase tracking-wide ${dark ? "text-white/70" : "text-ink-muted"}`}>
              {positionLabel(r.player_position)}
            </p>
            <p className="mt-2 text-sm">
              {r.votes} {r.votes > 1 ? "votes" : "vote"}
              {r.goals > 0 && ` · ${r.goals} ${r.goals > 1 ? "buts" : "but"}`}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
