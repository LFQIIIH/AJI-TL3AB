import type { Match } from "@/data/matches";
import { Gauge } from "lucide-react";
import { Icon } from "@/components/Icons";
import RelativeDay from "@/components/RelativeDay";
import { CATEGORY_LABEL, formatDay, formatTime, isAlmostFull, isFull, mapsLink, spotsLeft } from "@/lib/matches";

type MatchCardProps = {
  match: Match;
  action?: React.ReactNode;
  /** First letters of the first players booked online (public profiles only). */
  initials?: string[];
};

/** Level as 1–3 bars; "Tous niveaux" has none. */
const LEVEL_BARS: Record<string, number> = { "Débutant": 1, "Intermédiaire": 2, "Confirmé": 3 };
const FACE_COLORS = ["bg-primary", "bg-forest", "bg-[#B8733A]", "bg-[#3BA7C9]"];

export default function MatchCard({ match, action, initials = [] }: MatchCardProps) {
  const full = isFull(match);
  const almostFull = isAlmostFull(match);
  const left = spotsLeft(match);
  const pct = Math.min(100, Math.round((match.spotsTaken / match.totalSpots) * 100));

  return (
    <article className="card flex flex-col p-5">
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
            className="inline-flex min-h-11 shrink-0 items-center gap-1 font-semibold text-primary hover:underline"
          >
            <Icon name="route" className="h-4 w-4" />
            Itinéraire
          </a>
        </li>
        <li className="flex items-center gap-2">
          <Gauge className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="flex items-center gap-2">
            <span className="text-ink-muted">Niveau :</span>
            {LEVEL_BARS[match.level] && (
              <span className="inline-flex items-end gap-0.5" aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={`w-1.5 rounded-sm ${n <= LEVEL_BARS[match.level] ? "bg-primary" : "bg-line-strong"}`}
                    style={{ height: `${6 + n * 3}px` }}
                  />
                ))}
              </span>
            )}
            <span className="font-semibold">{match.level}</span>
          </span>
          {match.category && match.category !== "mixte" && match.category !== "femmes" && (
            <span className="ml-auto rounded-full bg-forest px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-highlight">
              {CATEGORY_LABEL[match.category]}
            </span>
          )}
        </li>
      </ul>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-2 text-sm">
          {full ? (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-red-800">Complet</span>
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
          <span className="flex shrink-0 items-center gap-2 text-ink-muted">
            {initials.length > 0 && (
              <span className="flex" aria-hidden="true">
                {initials.map((l, i) => (
                  <span
                    key={i}
                    className={`-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-[10px] font-bold text-white first:ml-0 ${FACE_COLORS[i % FACE_COLORS.length]}`}
                  >
                    {l}
                  </span>
                ))}
              </span>
            )}
            {!initials.length && <Icon name="users" className="h-4 w-4" />}
            <span>
              <span className="font-bold text-ink">{match.spotsTaken}</span>/{match.totalSpots}
            </span>
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
          <div className={`h-full rounded-full ${full ? "bg-red-600" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
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
