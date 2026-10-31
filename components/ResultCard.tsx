import type { Match } from "@/data/matches";
import TeamCrest from "@/components/TeamCrest";
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
        <p className="font-semibold capitalize text-ink-muted">
          {formatDay(match.date)} · {formatTime(match.time)}
        </p>
        <span className="rounded-md border border-line-strong px-2 py-0.5 text-xs font-bold">{match.format}</span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <Team name={home.name} winner={homeWon} draw={draw} />
        <p className="headline text-5xl tabular-nums sm:text-6xl">
          <span className={homeWon || draw ? "text-ink" : "text-ink-muted"}>{home.score}</span>
          <span className="mx-2 text-line-strong">–</span>
          <span className={!homeWon || draw ? "text-ink" : "text-ink-muted"}>{away.score}</span>
        </p>
        <Team name={away.name} winner={!homeWon && !draw} draw={draw} alignEnd />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
        <p className="text-ink-muted">
          {match.pitch} · {match.area}
        </p>
        {result.mvp && (
          <p className="shrink-0">
            <span className="font-bold text-primary">MVP</span> {result.mvp}
          </p>
        )}
      </div>
    </article>
  );
}

function Team({ name, winner, draw, alignEnd }: { name: string; winner: boolean; draw: boolean; alignEnd?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col ${alignEnd ? "items-end text-right" : "items-start"}`}>
      <TeamCrest name={name} className={`h-12 w-12 ${winner ? "drop-shadow-[0_0_6px_rgba(199,243,107,0.9)]" : ""}`} />
      <p className={`headline mt-2 break-words text-lg leading-none sm:text-2xl ${winner ? "text-primary" : ""}`}>{name}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {draw ? "Nul" : winner ? "Victoire" : "Défaite"}
      </p>
    </div>
  );
}
