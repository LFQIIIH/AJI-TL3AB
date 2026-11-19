"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Dices, Shirt } from "lucide-react";
import { WhatsAppIcon } from "@/components/Icons";
import { publicName } from "@/lib/profile";
import { drawTeams, drawText, type DrawEntrant, type TeamDraw } from "@/lib/team-draw";
import { saveDraw } from "./draw-actions";

export type DrawRosterPlayer = {
  user_id: string;
  name: string;
  goalkeeper: boolean;
  guests: number;
  attended: boolean | null;
};

const TEAM_STYLES = ["bg-forest text-white", "bg-highlight text-highlight-ink", "bg-[#B8733A] text-white", "bg-[#3BA7C9] text-white"];

/** Random teams, team names and jersey numbers for this match (admin and captain). */
export default function TeamDrawPanel({
  matchId,
  title,
  roster,
  initial,
}: {
  matchId: string;
  title: string;
  roster: DrawRosterPlayer[];
  initial: TeamDraw | null;
}) {
  const [included, setIncluded] = useState<Set<string>>(() => new Set(roster.filter((p) => p.attended !== false).map((p) => p.user_id)));
  const [extras, setExtras] = useState("");
  const [count, setCount] = useState(initial?.teams.length ?? 2);
  const [draw, setDraw] = useState<TeamDraw | null>(initial);
  const [saved, setSaved] = useState(Boolean(initial));
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const entrants = useMemo(() => {
    const list: DrawEntrant[] = [];
    for (const p of roster) {
      if (!included.has(p.user_id)) continue;
      const short = publicName(p.name);
      list.push({ name: short, user_id: p.user_id, goalkeeper: p.goalkeeper });
      for (let g = 0; g < p.guests; g++) list.push({ name: `Pote de ${short.split(" ")[0]}`, user_id: null });
    }
    const seen = new Set(list.map((e) => e.name.toLowerCase()));
    for (const line of extras.split("\n")) {
      const name = line.trim().replace(/\s+/g, " ").slice(0, 40);
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      list.push({ name, user_id: null });
    }
    return list.slice(0, 60);
  }, [roster, included, extras]);

  const canDraw = entrants.length >= count;

  function runDraw() {
    setDraw(drawTeams(entrants, count));
    setSaved(false);
    setMessage(null);
  }

  function rename(i: number, name: string) {
    if (!draw) return;
    setDraw({ ...draw, teams: draw.teams.map((t, j) => (j === i ? { ...t, name: name.slice(0, 40) } : t)) });
    setSaved(false);
  }

  function save() {
    if (!draw) return;
    start(async () => {
      const r = await saveDraw(matchId, draw);
      if (r.error) setMessage({ kind: "error", text: r.error });
      else {
        setSaved(true);
        setMessage({
          kind: "ok",
          text: draw.teams.length === 2 ? "Tirage enregistré. Les équipes sont prêtes dans le Direct." : "Tirage enregistré.",
        });
      }
    });
  }

  async function copy() {
    if (!draw) return;
    try {
      await navigator.clipboard.writeText(drawText(draw, title));
      setMessage({ kind: "ok", text: "Copié. Colle-le dans le groupe WhatsApp." });
    } catch {
      setMessage({ kind: "error", text: "Copie impossible sur cet appareil. Utilise le bouton WhatsApp." });
    }
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">Joueurs inscrits en ligne</p>
          {roster.length ? (
            <ul className="mt-2 space-y-1">
              {roster.map((p) => (
                <li key={p.user_id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-primary"
                      checked={included.has(p.user_id)}
                      onChange={(e) =>
                        setIncluded((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(p.user_id);
                          else next.delete(p.user_id);
                          return next;
                        })
                      }
                    />
                    <span className="font-semibold">{p.name}</span>
                    {p.goalkeeper && <span className="rounded-full bg-canvas-deep px-2 py-0.5 text-xs">Gardien</span>}
                    {p.guests > 0 && <span className="text-ink-muted">+1 pote</span>}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Personne n&apos;a réservé en ligne : ajoute les noms ci-dessous.</p>
          )}
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Autres joueurs (WhatsApp, sur place) : un nom par ligne</span>
            <textarea
              id="draw-extras"
              className="input min-h-32"
              value={extras}
              onChange={(e) => setExtras(e.target.value)}
              placeholder={"Hamza\nOthmane\nMehdi"}
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-semibold">Nombre d&apos;équipes</p>
            <div className="flex gap-2" role="group" aria-label="Nombre d'équipes">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={count === n}
                  onClick={() => setCount(n)}
                  className={`chip min-h-11 min-w-11 justify-center ${count === n ? "chip-on" : "chip-off"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn-primary w-full sm:w-auto" disabled={!canDraw} onClick={runDraw}>
            <Dices className="h-5 w-5" aria-hidden="true" />
            {draw ? "Relancer le tirage" : "Tirer au sort"} ({entrants.length} joueur{entrants.length > 1 ? "s" : ""})
          </button>
          {!canDraw && <p className="text-sm text-ink-muted">Il faut au moins un joueur par équipe.</p>}
        </div>
      </div>

      {draw && (
        <div className="mt-6 border-t border-line pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {saved ? "Tirage enregistré" : "Nouveau tirage, pas encore enregistré"}
              <span className="font-normal text-ink-muted"> · numéros de 1 à 99, tous différents</span>
            </p>
          </div>
          <div className={`mt-4 grid gap-4 ${draw.teams.length > 2 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
            {draw.teams.map((t, i) => (
              <section key={i} className="overflow-hidden rounded-2xl border border-line">
                <div className={`px-4 py-3 ${TEAM_STYLES[i]}`}>
                  <label className="sr-only" htmlFor={`team-name-${i}`}>
                    Nom de l&apos;équipe {i + 1}
                  </label>
                  <input
                    id={`team-name-${i}`}
                    value={t.name}
                    onChange={(e) => rename(i, e.target.value)}
                    className="headline w-full bg-transparent text-2xl outline-none placeholder:opacity-60 focus-visible:underline"
                  />
                  <p className="text-xs font-semibold opacity-80">
                    {draw.teams.length === 2 ? (i === 0 ? "Équipe 1" : "Équipe 2") : `Équipe ${i + 1}`} · {t.players.length} joueurs
                  </p>
                </div>
                <ul className="divide-y divide-line bg-surface">
                  {t.players.map((p) => (
                    <li key={`${p.number}-${p.name}`} className="flex items-center gap-3 px-4 py-2">
                      <span className="flex h-10 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-canvas-deep" aria-label={`Maillot ${p.number}`}>
                        <Shirt className="h-3 w-3 text-primary" aria-hidden="true" />
                        <span className="headline text-xl leading-none tabular-nums">{p.number}</span>
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                      {!p.user_id && <span className="text-xs text-ink-muted">hors site</span>}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="btn-primary" disabled={pending || saved} onClick={save}>
              {pending ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer le tirage"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(drawText(draw, title))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-[#25D366] text-[#08361c] hover:brightness-95"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Envoyer sur WhatsApp
            </a>
            <button type="button" className="btn-ghost" onClick={copy}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copier
            </button>
          </div>
          {draw.teams.length === 2 && !saved && (
            <p className="mt-2 text-xs text-ink-muted">Enregistrer met aussi les noms d&apos;équipes et les équipes des joueurs inscrits dans le Direct.</p>
          )}
        </div>
      )}

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`mt-4 text-sm font-semibold ${message.kind === "error" ? "text-red-700" : "text-primary"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
