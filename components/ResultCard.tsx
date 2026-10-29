import type { Match } from "@/data/matches";
import { formatDay, formatTime } from "@/lib/matches";

export default function ResultCard({ match }: { match: Match }) {
  const result = match.result;
  if (!result) return null;

  const { home, away } = result;
  const draw = home.score === away.score;
  const homeWon = home.score > away.score;

  return (
    <article className="card flex flex-col p-5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-semibold capitalize text-chalk-muted">
          {formatDay(match.date)} · {formatTime(match.time)}
        </p>
        <span className="rounded-md border border-night-600 px-2 py-0.5 text-xs font-bold">{match.format}</span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Team name={home.name} winner={homeWon} draw={draw} />
        <p className="headline text-6xl tabular-nums">
          <span className={homeWon || draw ? "text-chalk" : "text-chalk-muted"}>{home.score}</span>
          <span className="mx-2 text-night-600">–</span>
          <span className={!homeWon || draw ? "text-chalk" : "text-chalk-muted"}>{away.score}</span>
        </p>
        <Team name={away.name} winner={!homeWon && !draw} draw={draw} alignEnd />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-night-700 pt-4 text-sm">
        <p className="text-chalk-muted">
          {match.pitch} · {match.area}
        </p>
        {result.mvp && (
          <p className="shrink-0">
            <span className="font-bold text-accent">MVP</span> {result.mvp}
          </p>
        )}
      </div>
    </article>
  );
}

function Team({ name, winner, draw, alignEnd }: { name: string; winner: boolean; draw: boolean; alignEnd?: boolean }) {
  return (
    <div className={alignEnd ? "text-right" : ""}>
      <p className={`headline text-2xl ${winner ? "text-accent" : ""}`}>{name}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-chalk-muted">
        {draw ? "Nul" : winner ? "Victoire" : "Défaite"}
      </p>
    </div>
  );
}
