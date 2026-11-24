"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Share2 } from "lucide-react";
import BadgeIcon from "@/components/BadgeIcon";
import Modal from "@/components/Modal";
import { computeBadges, type Badge, type MyStats } from "@/lib/community";
import { levelFor, ordinal, POINTS } from "@/lib/points";
import { shareCard } from "@/lib/share";
import { supabaseClient } from "@/lib/supabase/lazy";

type Card = {
  match_id: string;
  home_name: string;
  away_name: string;
  home_score: number | null;
  away_score: number | null;
  team: "home" | "away" | null;
  result: "V" | "N" | "D" | null;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  awards: string[];
  points: number;
};
type Progress = { points_total: number; rank_month: number | null };
type Recap = { card: Card; total: number; before: number; rank: number | null; rankBefore: number | null; newBadges: Badge[] };

// What the player last saw, kept on this phone, to show what changed since.
const KEY = { seen: "aji:recap-seen", points: "aji:points-total", badges: "aji:badges", rank: "aji:rank" };
const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const pts = (key: string) => POINTS.find((p) => p.key === key)?.value ?? 0;
const RESULT = { V: "Victoire", N: "Match nul", D: "Défaite" } as const;

/** Full-screen recap of the player's last match, once (or when opened from a notification). */
export default function MatchRecap() {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [open, setOpen] = useState(false);
  const saveBaseline = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const client = await supabaseClient();
      const forced = new URLSearchParams(window.location.search).get("recap");
      const [last, progressRes, statsRes] = await Promise.all([
        forced ? Promise.resolve({ data: forced }) : client.rpc("my_last_match"),
        client.rpc("my_progress"),
        client.rpc("my_stats"),
      ]);
      const progress = ((progressRes.data ?? []) as Progress[])[0];
      const stats = ((statsRes.data ?? []) as MyStats[])[0];
      if (cancelled || !progress || !stats) return;
      const earned = computeBadges(stats).filter((b) => b.earned);
      saveBaseline.current = () => {
        write(KEY.points, progress.points_total);
        write(KEY.badges, earned.map((b) => b.id));
        write(KEY.rank, progress.rank_month);
      };

      const matchId = typeof last.data === "string" ? last.data : null;
      const seen = read<string[]>(KEY.seen, []);
      if (!matchId || (!forced && seen.includes(matchId))) {
        saveBaseline.current();
        return;
      }
      const { data } = await client.rpc("my_match_card", { p_match_id: matchId });
      const card = ((data ?? []) as Card[])[0];
      if (cancelled || !card) {
        saveBaseline.current();
        return;
      }
      const storedBadges = read<string[] | null>(KEY.badges, null);
      const newBadges = storedBadges ? earned.filter((b) => !storedBadges.includes(b.id)) : stats.matches <= 1 ? earned : [];
      const before = read<number | null>(KEY.points, null) ?? Math.max(0, progress.points_total - card.points);
      setRecap({ card, total: progress.points_total, before: Math.min(before, progress.points_total), rank: progress.rank_month, rankBefore: read<number | null>(KEY.rank, null), newBadges });
      setOpen(true);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function close() {
    setOpen(false);
    if (recap) write(KEY.seen, [...read<string[]>(KEY.seen, []).slice(-30), recap.card.match_id]);
    saveBaseline.current();
    if (new URLSearchParams(window.location.search).has("recap")) window.history.replaceState(null, "", "/compte");
  }

  if (!recap) return null;
  return (
    <Modal open={open} onClose={close} title="Ton match">
      <RecapBody recap={recap} onClose={close} />
    </Modal>
  );
}

function RecapBody({ recap, onClose }: { recap: Recap; onClose: () => void }) {
  const { card, total, before, rank, rankBefore, newBadges } = recap;
  const [shown, setShown] = useState(0);
  const [bar, setBar] = useState(levelFor(before));
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const levelBefore = levelFor(before);
  const levelAfter = levelFor(total);
  const levelUp = levelAfter.level > levelBefore.level;

  // Count up the points, then fill the level bar.
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(card.points);
      setBar(levelAfter);
      return;
    }
    let n = 0;
    const step = Math.max(1, Math.round(card.points / 20));
    const t = setInterval(() => {
      n = Math.min(card.points, n + step);
      setShown(n);
      if (n >= card.points) {
        clearInterval(t);
        setTimeout(() => setBar(levelAfter), 150);
      }
    }, 40);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines: [string, number][] = [
    ["Match joué", pts("played")],
    ...(card.result === "V" ? [["Victoire", pts("win")] as [string, number]] : card.result === "N" ? [["Match nul", pts("draw")] as [string, number]] : []),
    ...(card.goals ? [[`${card.goals} but${card.goals > 1 ? "s" : ""}`, card.goals * pts("goal")] as [string, number]] : []),
    ...(card.assists ? [[`${card.assists} passe${card.assists > 1 ? "s" : ""}`, card.assists * pts("assist")] as [string, number]] : []),
    ...(card.awards.length ? [["Élu par les joueurs", card.awards.length * pts("award")] as [string, number]] : []),
    ...(card.yellow ? [["Carton jaune", card.yellow * pts("yellow")] as [string, number]] : []),
    ...(card.red ? [["Carton rouge", card.red * pts("red")] as [string, number]] : []),
  ];
  const moved = rank && rankBefore ? rankBefore - rank : 0;

  async function share() {
    setSharing(true);
    setShareError("");
    const ok = await shareCard(`/api/carte/joueur?match=${encodeURIComponent(card.match_id)}`, "ma-carte-aji-tl3ab.png", "Ma carte du match · AJI TL3AB").catch(() => false);
    if (!ok) setShareError("La carte n'a pas pu être créée. Réessaie.");
    setSharing(false);
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        {card.result && (
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${card.result === "D" ? "bg-canvas-deep text-ink" : "bg-highlight text-highlight-ink"}`}>
            {RESULT[card.result]}
          </span>
        )}
        {card.home_score !== null && card.away_score !== null && (
          <p className="mt-2 font-semibold">
            <span className={card.team === "home" ? "text-primary" : ""}>{card.home_name}</span>{" "}
            <span className="headline mx-1 text-2xl tabular-nums">
              {card.home_score}–{card.away_score}
            </span>{" "}
            <span className={card.team === "away" ? "text-primary" : ""}>{card.away_name}</span>
          </p>
        )}
        <p className="headline mt-3 text-7xl text-primary tabular-nums" aria-live="polite">
          +{shown}
          <span className="ml-1 text-3xl">pts</span>
        </p>
      </div>

      <ul className="flex flex-wrap justify-center gap-2 text-xs font-semibold">
        {lines.map(([label, value]) => (
          <li key={label} className={`rounded-full px-2.5 py-1 ${value < 0 ? "bg-red-100 text-red-800" : "bg-canvas-deep"}`}>
            {label} {value > 0 ? "+" : ""}
            {value}
          </li>
        ))}
      </ul>

      <div>
        {levelUp && <p className="mb-2 rounded-xl bg-highlight px-3 py-2 text-center text-sm font-bold text-highlight-ink">Niveau {levelAfter.level} atteint : {levelAfter.name} !</p>}
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            Niv. {bar.level} · {bar.name}
          </span>
          <span className="text-ink-muted tabular-nums">{levelAfter.next ? `${total} / ${levelAfter.next} pts` : `${total} pts`}</span>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-canvas-deep">
          <div className="h-full rounded-full bg-primary transition-all duration-1000 ease-out motion-reduce:transition-none" style={{ width: `${Math.max(3, Math.round(bar.progress * 100))}%` }} />
        </div>
      </div>

      {rank && (
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold">
          {ordinal(rank)} du classement du mois
          {moved > 0 && (
            <span className="inline-flex items-center text-primary">
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
              {moved} place{moved > 1 ? "s" : ""}
            </span>
          )}
          {moved < 0 && (
            <span className="inline-flex items-center text-red-700">
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
              {-moved}
            </span>
          )}
        </p>
      )}

      {newBadges.length > 0 && (
        <div>
          <p className="text-center text-xs font-bold uppercase tracking-wide text-ink-muted">Nouveau badge</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {newBadges.map((b) => (
              <li key={b.id} className="inline-flex items-center gap-2 rounded-full bg-highlight px-3 py-1.5 text-sm font-bold text-highlight-ink">
                <BadgeIcon id={b.id} className="h-4 w-4" />
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-2">
        <button type="button" onClick={share} disabled={sharing} className="btn-primary w-full">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {sharing ? "Création de ta carte…" : "Partager ma carte"}
        </button>
        {shareError && (
          <p role="alert" className="text-center text-sm font-semibold text-red-700">
            {shareError}
          </p>
        )}
        <Link href={`/match/${encodeURIComponent(card.match_id)}`} onClick={onClose} className="btn-ghost w-full">
          Voir le match
        </Link>
      </div>
    </div>
  );
}
