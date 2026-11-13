import { levelFor, nextTier, tierFor } from "@/lib/points";

/** "Niv. 3 · Régulier" with a progress bar to the next level (all-time points). */
export function LevelBar({ points, className = "" }: { points: number; className?: string }) {
  const l = levelFor(points);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">
          <span className="headline text-2xl text-primary">Niv. {l.level}</span> · {l.name}
        </p>
        <p className="text-sm text-ink-muted">{l.next ? `${points} / ${l.next} pts` : `${points} pts · niveau max`}</p>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-canvas-deep"
        role="progressbar"
        aria-label={`Progression vers le niveau ${l.level + 1}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(l.progress * 100)}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, Math.round(l.progress * 100))}%` }} />
      </div>
    </div>
  );
}

/** Monthly tier pill ("🥈 Argent") or the points still needed for Bronze. */
export function TierPill({ monthPoints }: { monthPoints: number }) {
  const t = tierFor(monthPoints);
  if (t)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-highlight px-3 py-1 text-sm font-bold text-highlight-ink">
        <span aria-hidden="true">{t.icon}</span> {t.label}
      </span>
    );
  const n = nextTier(monthPoints);
  return <span className="inline-flex rounded-full bg-canvas-deep px-3 py-1 text-sm font-semibold text-ink-muted">{n ? `${n.min - monthPoints} pts pour ${n.label}` : ""}</span>;
}
