"use client";

import { useState } from "react";
import { Share2, UserRound } from "lucide-react";
import { shareCard } from "@/lib/share";
import { useSessionUser } from "@/lib/supabase/useSession";

/** On a match page: share the result card; signed-in players also get their own card. */
export default function ShareMatchButtons({ matchId }: { matchId: string }) {
  const user = useSessionUser();
  const [busy, setBusy] = useState<"match" | "me" | null>(null);
  const [note, setNote] = useState("");
  const id = encodeURIComponent(matchId);

  async function go(kind: "match" | "me") {
    setBusy(kind);
    setNote("");
    const ok =
      kind === "match"
        ? await shareCard(`/api/carte/match?match=${id}`, "resultat-aji-tl3ab.png", "Résultat · AJI TL3AB").catch(() => false)
        : await shareCard(`/api/carte/joueur?match=${id}`, "ma-carte-aji-tl3ab.png", "Ma carte du match · AJI TL3AB").catch(() => false);
    if (!ok) setNote(kind === "me" ? "Ta carte existe seulement si tu as joué ce match (réservé avec ton compte)." : "L'image n'a pas pu être créée. Réessaie.");
    setBusy(null);
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" disabled={busy !== null} onClick={() => go("match")}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {busy === "match" ? "Création…" : "Partager le résultat"}
        </button>
        {user && (
          <button type="button" className="btn-ghost" disabled={busy !== null} onClick={() => go("me")}>
            <UserRound className="h-4 w-4" aria-hidden="true" />
            {busy === "me" ? "Création…" : "Ma carte du match"}
          </button>
        )}
      </div>
      {note && <p className="mt-2 text-sm text-ink-muted">{note}</p>}
    </div>
  );
}
