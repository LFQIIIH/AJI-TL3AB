"use client";

import { currentMonthRange, monthLabel } from "@/lib/community";
import { positionLabel, type Position } from "@/lib/profile";
import PositionArt from "./PositionArt";
import { useRpc } from "./useRpc";

type Row = { name: string; player_position: Position; votes: number; goals: number };

const ART_FOR: Record<Position, "buteur" | "gardien" | "defenseur" | "milieu"> = {
  attaquant: "buteur",
  gardien: "gardien",
  defenseur: "defenseur",
  milieu: "milieu",
};

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
          <li key={r.name + i} className="overflow-hidden rounded-xl bg-canvas-deep text-center">
            <div className="relative flex justify-center bg-forest pt-2">
              <span className="headline absolute left-2 top-1 text-2xl text-highlight">#{i + 1}</span>
              <PositionArt category={ART_FOR[r.player_position]} className="h-24 w-24" />
            </div>
            <div className="p-3 text-ink">
              <p className="headline mt-1 text-2xl">{r.name}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{positionLabel(r.player_position)}</p>
              <p className="mt-2 text-sm">
                {r.votes} {r.votes > 1 ? "votes" : "vote"}
                {r.goals > 0 && ` · ${r.goals} ${r.goals > 1 ? "buts" : "but"}`}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
