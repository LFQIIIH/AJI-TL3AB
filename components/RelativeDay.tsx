"use client";

import { useEffect, useState } from "react";
import { relativeDayLabel } from "@/lib/matches";

/**
 * "Aujourd'hui" / "Demain" badge. Computed after mount so a cached page
 * rendered yesterday never shows a stale label (and never mismatches hydration).
 */
export default function RelativeDay({ date }: { date: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => setLabel(relativeDayLabel(date)), [date]);
  if (!label) return null;
  return (
    <span className="rounded-full bg-forest px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-highlight">{label}</span>
  );
}
