import type { Match } from "@/data/matches";
import { formatDay, formatTime, isFull, spotsLeft } from "@/lib/matches";

type MatchCardProps = {
  match: Match;
  action?: React.ReactNode;
};

export default function MatchCard({ match, action }: MatchCardProps) {
  const full = isFull(match);
  const left = spotsLeft(match);
  const pct = Math.min(100, Math.round((match.spotsTaken / match.totalSpots) * 100));

  return (
    <article className={`card flex flex-col p-5 ${full ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize text-chalk-muted">{formatDay(match.date)}</p>
          <p className="headline mt-1 text-5xl">{formatTime(match.time)}</p>
        </div>
        <span className="headline rounded-lg bg-accent px-3 py-1.5 text-2xl text-accent-ink">{match.format}</span>
      </div>

      <div className="mt-4 space-y-1">
        <p className="font-semibold">{match.pitch}</p>
        <p className="text-sm text-chalk-muted">
          {match.area} · {match.level}
        </p>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          {full ? (
            <span className="font-bold uppercase tracking-wide text-chalk-muted">Complet</span>
          ) : (
            <span>
              <span className="font-bold text-accent">{left}</span>{" "}
              {left > 1 ? "places restantes" : "place restante"}
            </span>
          )}
          <span className="text-chalk-muted">
            {match.spotsTaken}/{match.totalSpots}
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-night-600"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={match.totalSpots}
          aria-valuenow={match.spotsTaken}
          aria-label="Places réservées"
        >
          <div className={`h-full rounded-full ${full ? "bg-chalk-muted" : "bg-accent"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-night-700 pt-4">
        <p>
          <span className="headline text-3xl">{match.priceMad}</span>{" "}
          <span className="text-sm text-chalk-muted">MAD / joueur</span>
        </p>
        {action}
      </div>
    </article>
  );
}
