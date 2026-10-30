"use client";

import type { Match } from "@/data/matches";
import ResultCard from "@/components/ResultCard";
import type { Award } from "@/lib/community";
import MatchAwards from "./MatchAwards";
import { useRpc } from "./useRpc";

/** Recent results, each with its player awards once voting has closed. */
export default function ResultsGrid({ results }: { results: Match[] }) {
  const awards = useRpc<Award>("match_awards", { p_match_ids: results.map((m) => m.id) }) ?? [];
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {results.map((m) => (
        <div key={m.id}>
          <ResultCard match={m} />
          <MatchAwards awards={awards.filter((a) => a.match_id === m.id)} />
        </div>
      ))}
    </div>
  );
}
