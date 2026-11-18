"use client";

import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { formatMorocco } from "@/lib/morocco-time";

const pad = (n: number) => String(n).padStart(2, "0");

/** "Nouveaux matchs publiés dans 02j 04h 24m" — calls onReleased at zero. */
export default function NextRelease({ at, onReleased }: { at: string; onReleased: () => void }) {
  const target = new Date(at).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= target) {
        clearInterval(timer);
        onReleased();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [target, onReleased]);

  const left = Math.max(0, target - (now ?? target));
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const parts: [string, string][] =
    d > 0
      ? [[pad(d), d > 1 ? "jours" : "jour"], [pad(h), "heures"], [pad(m), "min"]]
      : [[pad(h), "heures"], [pad(m), "min"], [pad(s), "sec"]];

  return (
    <section aria-label="Prochaine publication de matchs" className="rounded-2xl bg-forest px-5 py-5 text-center text-white">
      <p className="flex items-center justify-center gap-2 text-sm font-semibold">
        <CalendarClock className="h-4 w-4 text-highlight" aria-hidden="true" />
        Nouveaux matchs publiés dans
      </p>
      <p className="mt-3 flex justify-center gap-2" aria-live="off">
        {parts.map(([value, unit], i) => (
          <span key={i} className="flex min-w-[4.5rem] flex-col items-center rounded-xl bg-highlight px-3 pb-1.5 pt-2 text-highlight-ink">
            <span className="headline text-4xl tabular-nums leading-none">{now === null ? "--" : value}</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">{unit}</span>
          </span>
        ))}
      </p>
      <p className="mt-2 text-xs capitalize text-white/70">
        {formatMorocco(at, { weekday: "long", day: "numeric", month: "long" })} à {formatMorocco(at, { hour: "2-digit", minute: "2-digit" })}
      </p>
    </section>
  );
}
