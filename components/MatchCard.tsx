import type { Match } from "@/data/matches";
import { Icon } from "@/components/Icons";
import RelativeDay from "@/components/RelativeDay";
import { formatDay, formatTime, isAlmostFull, isFull, mapsLink, spotsLeft } from "@/lib/matches";

type MatchCardProps = {
  match: Match;
  action?: React.ReactNode;
};

export default function MatchCard({ match, action }: MatchCardProps) {
  const full = isFull(match);
  const almostFull = isAlmostFull(match);
  const left = spotsLeft(match);
  const pct = Math.min(100, Math.round((match.spotsTaken / match.totalSpots) * 100));

  return (
    <article className={`card flex flex-col p-5 ${full ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-muted">
            <Icon name="calendar" className="h-4 w-4" />
            <span className="capitalize">{formatDay(match.date)}</span>
            <RelativeDay date={match.date} />
          </p>
          <p className="headline mt-1 text-5xl">{formatTime(match.time)}</p>
        </div>
        <span className="headline rounded-lg bg-highlight px-3 py-1.5 text-2xl text-highlight-ink">{match.format}</span>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{match.pitch}</span>
            {match.area && <span className="text-ink-muted"> · {match.area}</span>}
          </span>
          <a
            href={mapsLink(match)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline"
          >
            <Icon name="route" className="h-4 w-4" />
            Itinéraire
          </a>
        </li>
        <li className="flex items-center gap-2">
          <Icon name="level" className="h-4 w-4 shrink-0 text-primary" />
          <span>
            <span className="text-ink-muted">Niveau :</span> <span className="font-semibold">{match.level}</span>
          </span>
        </li>
      </ul>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-2 text-sm">
          {full ? (
            <span className="font-bold uppercase tracking-wide text-ink-muted">Complet</span>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span>
                <span className="font-bold text-primary">{left}</span> {left > 1 ? "places restantes" : "place restante"}
              </span>
              {almostFull && (
                <span className="rounded-full bg-highlight px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-highlight-ink">
                  Dernières places
                </span>
              )}
            </span>
          )}
          <span className="flex shrink-0 items-center gap-1 text-ink-muted">
            <Icon name="users" className="h-4 w-4" />
            {match.spotsTaken}/{match.totalSpots}
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={match.totalSpots}
          aria-valuenow={match.spotsTaken}
          aria-label="Places réservées"
        >
          <div className={`h-full rounded-full ${full ? "bg-ink-muted" : "bg-primary"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p>
          <span className="headline text-3xl">{match.priceMad}</span>{" "}
          <span className="text-sm text-ink-muted">MAD / joueur</span>
        </p>
        {action}
      </div>
    </article>
  );
}
