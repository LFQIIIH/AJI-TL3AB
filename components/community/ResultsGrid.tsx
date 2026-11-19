"use client";

import type { Match } from "@/data/matches";
import ResultCard from "@/components/ResultCard";
import type { Award } from "@/lib/community";
import MatchAwards from "./MatchAwards";
import { useRpc } from "./useRpc";

/** Recent results, each with its player awards once voting has closed. */
/** `phoneLimit`: show only the first N on phones (the rest from the sm breakpoint). */
export default function ResultsGrid({ results, phoneLimit }: { results: Match[]; phoneLimit?: number }) {
  const awards = useRpc<Award>("match_awards", { p_match_ids: results.map((m) => m.id) }) ?? [];
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {results.map((m, i) => (
        <div key={m.id} className={phoneLimit !== undefined && i >= phoneLimit ? "hidden sm:block" : undefined}>
          <ResultCard match={m} details />
          <MatchAwards awards={awards.filter((a) => a.match_id === m.id)} />
        </div>
      ))}
    </div>
  );
}
