"use client";

import { useMemo, useState } from "react";
import type { Match } from "@/data/matches";
import ResultsGrid from "@/components/community/ResultsGrid";

const PAGE = 12;
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Played matches with filters (format, neighbourhood) and a player / team search. */
export default function PastMatches({ results, players }: { results: Match[]; players: Record<string, string[]> }) {
  const [format, setFormat] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  const formats = useMemo(() => ["5v5", "7v7", "9v9"].filter((f) => results.some((m) => m.format === f)), [results]);
  const areas = useMemo(() => Array.from(new Set(results.map((m) => m.area).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")), [results]);

  const q = fold(query);
  const filtered = results.filter((m) => {
    if (format && m.format !== format) return false;
    if (area && m.area !== area) return false;
    if (!q) return true;
    const haystack = [m.result?.home.name, m.result?.away.name, m.result?.mvp, m.pitch, ...(players[m.id] ?? [])].filter(Boolean).map((s) => fold(s!));
    return haystack.some((h) => h.includes(q));
  });
  const visible = filtered.slice(0, shown);
  const filtering = format !== null || area !== null || q !== "";

  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button key={label} type="button" onClick={onClick} aria-pressed={on} className={`chip shrink-0 ${on ? "chip-on" : "chip-off"}`}>
      {label}
    </button>
  );

  if (!results.length) {
    return (
      <div className="card p-8 text-center">
        <p className="headline text-3xl">Pas encore de résultats</p>
        <p className="mt-2 text-ink-muted">Les scores apparaissent ici après chaque match.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <label className="block max-w-md">
          <span className="eyebrow mb-2 block">Rechercher</span>
          <input
            className="input"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Joueur, équipe ou terrain (ex : Yassine)"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
        {formats.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {chip(format === null, "Tous les formats", () => setFormat(null))}
            {formats.map((f) => chip(format === f, f, () => setFormat(f)))}
          </div>
        )}
        {areas.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {chip(area === null, "Tous les quartiers", () => setArea(null))}
            {areas.map((a) => chip(area === a, a, () => setArea(a)))}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4" aria-live="polite">
        <p className="text-sm text-ink-muted">
          <span className="font-bold text-ink">{filtered.length}</span> {filtered.length > 1 ? "matchs" : "match"}
          {q && players && <> avec « {query.trim()} »</>}
        </p>
        {filtering && (
          <button
            type="button"
            onClick={() => {
              setFormat(null);
              setArea(null);
              setQuery("");
            }}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
          >
            Tout effacer
          </button>
        )}
      </div>

      {visible.length ? (
        <ResultsGrid results={visible} />
      ) : (
        <p className="card mt-6 p-8 text-center text-ink-muted">Aucun match pour cette recherche.</p>
      )}
      {filtered.length > shown && (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="btn-ghost">
            Voir plus
          </button>
        </div>
      )}
    </>
  );
}
