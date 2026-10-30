"use client";

import { useState } from "react";
import { AWARD_LABELS, awardValueLabel, type Award, type AwardCategory } from "@/lib/community";

const ORDER: AwardCategory[] = ["buteur", "gardien", "defenseur", "milieu"];

/** Award winners under a played match, each with a "share as story" button. */
export default function MatchAwards({ awards }: { awards: Award[] }) {
  if (!awards.length) return null;
  const sorted = [...awards].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  return (
    <ul className="mt-3 space-y-2">
      {sorted.map((a) => (
        <li key={a.category} className="flex items-center gap-3 rounded-xl bg-canvas-deep px-3 py-2 text-sm">
          <span aria-hidden="true">🏆</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">{AWARD_LABELS[a.category]}</span>
            <span className="font-semibold">{a.name}</span> <span className="text-ink-muted">· {awardValueLabel(a)}</span>
          </span>
          <ShareButton award={a} />
        </li>
      ))}
    </ul>
  );
}

function ShareButton({ award }: { award: Award }) {
  const [busy, setBusy] = useState(false);
  const url = `/api/carte?match=${encodeURIComponent(award.match_id)}&cat=${award.category}`;

  async function share() {
    setBusy(true);
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `aji-tl3ab-${award.category}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${AWARD_LABELS[award.category]} · AJI TL3AB` });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      // share sheet dismissed — nothing to do
    }
    setBusy(false);
  }

  return (
    <button type="button" onClick={share} disabled={busy} className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-ink hover:bg-primary-hover">
      {busy ? "…" : "Partager"}
    </button>
  );
}
