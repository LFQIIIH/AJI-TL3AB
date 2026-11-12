"use client";

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
  const parts = d > 0 ? [`${pad(d)}j`, `${pad(h)}h`, `${pad(m)}m`] : [`${pad(h)}h`, `${pad(m)}m`, `${pad(s)}s`];

  return (
    <section aria-label="Prochaine publication de matchs" className="rounded-2xl bg-forest px-5 py-5 text-center text-white">
      <p className="text-sm font-semibold">Nouveaux matchs publiés dans</p>
      <p className="mt-2 flex justify-center gap-2" aria-live="off">
        {(now === null ? ["--", "--", "--"] : parts).map((p, i) => (
          <span key={i} className="headline rounded-lg bg-highlight px-3 py-1.5 text-3xl text-highlight-ink">
            {p}
          </span>
        ))}
      </p>
      <p className="mt-2 text-xs capitalize text-white/70">
        {formatMorocco(at, { weekday: "long", day: "numeric", month: "long" })} à {formatMorocco(at, { hour: "2-digit", minute: "2-digit" })}
      </p>
    </section>
  );
}
