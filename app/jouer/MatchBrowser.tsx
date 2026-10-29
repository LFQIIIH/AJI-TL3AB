"use client";

import { useMemo, useState } from "react";
import type { Match, MatchFormat } from "@/data/matches";
import MatchCard from "@/components/MatchCard";
import Modal from "@/components/Modal";
import { whatsappLink } from "@/lib/config";
import { formatDay, formatDayLong, formatTime, isFull } from "@/lib/matches";

const FORMATS: MatchFormat[] = ["5v5", "7v7", "9v9"];
const NAME_KEY = "ajitl3ab:playerName";

function readSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // storage unavailable — not critical
  }
}

export default function MatchBrowser({ matches }: { matches: Match[] }) {
  const [day, setDay] = useState<string | null>(null);
  const [format, setFormat] = useState<MatchFormat | null>(null);
  const [selected, setSelected] = useState<Match | null>(null);
  const [name, setName] = useState("");

  const days = useMemo(() => Array.from(new Set(matches.map((m) => m.date))), [matches]);
  const formats = FORMATS.filter((f) => matches.some((m) => m.format === f));

  const filtered = matches.filter(
    (m) => (day === null || m.date === day) && (format === null || m.format === format),
  );

  function openBooking(m: Match) {
    setName((n) => n || readSavedName());
    setSelected(m);
  }

  function confirmBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const player = name.trim();
    if (!player) return;
    saveName(player);
    const message = [
      "Salam AJI TL3AB ! Bghit nreservi blasti 👋",
      "",
      `⚽ Match ${selected.format} — ${selected.level}`,
      `📅 ${formatDayLong(selected.date)}`,
      `⏰ ${formatTime(selected.time)}`,
      `📍 ${selected.pitch} (${selected.area})`,
      `💰 ${selected.priceMad} MAD`,
      "",
      `Nom : ${player}`,
    ].join("\n");
    window.open(whatsappLink(message), "_blank", "noopener,noreferrer");
    setSelected(null);
  }

  return (
    <>
      <div className="space-y-4">
        <FilterRow label="Jour">
          <Chip on={day === null} onClick={() => setDay(null)}>Tous</Chip>
          {days.map((d) => (
            <Chip key={d} on={day === d} onClick={() => setDay(d)}>
              <span className="capitalize">{formatDay(d)}</span>
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Format">
          <Chip on={format === null} onClick={() => setFormat(null)}>Tous</Chip>
          {formats.map((f) => (
            <Chip key={f} on={format === f} onClick={() => setFormat(f)}>{f}</Chip>
          ))}
        </FilterRow>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              action={
                isFull(m) ? (
                  <button type="button" className="btn-ghost px-5 py-2.5" disabled>
                    Complet
                  </button>
                ) : (
                  <button type="button" className="btn-primary px-5 py-2.5" onClick={() => openBooking(m)}>
                    Réserver
                  </button>
                )
              }
            />
          ))}
        </div>
      ) : (
        <div className="card mt-8 p-8 text-center">
          <p className="headline text-3xl">Walou pour l&apos;instant</p>
          <p className="mt-2 text-ink-muted">Aucun match avec ces filtres. Essaie un autre jour ou format.</p>
        </div>
      )}

      <Modal open={selected !== null} onClose={() => setSelected(null)} title="Réserve ta place">
        {selected && (
          <form onSubmit={confirmBooking} className="space-y-4">
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-ink">{selected.format}</span> ·{" "}
              <span className="capitalize">{formatDayLong(selected.date)}</span> · {formatTime(selected.time)} ·{" "}
              {selected.pitch}
            </p>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Smiytek ? (ton prénom)</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Yassine"
                autoComplete="given-name"
                required
                autoFocus
                maxLength={60}
              />
            </label>
            <button type="submit" className="btn-primary w-full" disabled={!name.trim()}>
              Continuer sur WhatsApp
            </button>
            <p className="text-center text-xs text-ink-muted">On confirme ta place directement sur WhatsApp.</p>
          </form>
        )}
      </Modal>
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`chip shrink-0 ${on ? "chip-on" : "chip-off"}`}>
      {children}
    </button>
  );
}
