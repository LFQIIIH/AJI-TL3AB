import type { Match } from "@/data/matches";
import { formatMoroccoDate, moroccoParts, moroccoToDate, moroccoToday } from "@/lib/morocco-time";

// Morocco time (UTC+0 since 2026-09-20, UTC+1 before): see lib/morocco-time.ts.

export function matchStart(m: Match): Date {
  return m.startsAt ? new Date(m.startsAt) : moroccoToDate(m.date, m.time);
}

/** Marrakech local date ("2026-11-20") and time ("20:00") of an instant. */
export const marrakechParts = moroccoParts;

/** Marrakech local date + time → the exact instant. */
export const marrakechToDate = moroccoToDate;

export const CATEGORY_LABEL: Record<string, string> = { mixte: "Mixte", hommes: "Hommes", femmes: "Femmes", enfants: "Enfants" };

export function spotsLeft(m: Match): number {
  return Math.max(0, m.totalSpots - m.spotsTaken);
}

export function isFull(m: Match): boolean {
  return spotsLeft(m) === 0;
}

/** At or below this many spots left, a match is flagged "Dernières places". */
export const ALMOST_FULL_SPOTS = 2;

export function isAlmostFull(m: Match): boolean {
  const left = spotsLeft(m);
  return left > 0 && left <= ALMOST_FULL_SPOTS;
}

export function mapsLink(m: Match): string {
  if (m.mapsUrl) return m.mapsUrl;
  const query = [m.pitch, m.area, "Marrakech"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Today's date in Marrakech as YYYY-MM-DD. */
const marrakechToday = (now: Date) => moroccoToday(now);

/** "Aujourd'hui", "Demain" or null. */
export function relativeDayLabel(date: string, now: Date = new Date()): string | null {
  const today = marrakechToday(now);
  const tomorrow = marrakechToday(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  if (date === today) return "Aujourd'hui";
  if (date === tomorrow) return "Demain";
  return null;
}

/** "ven. 30 oct." */
export function formatDay(date: string): string {
  return formatMoroccoDate(date, { weekday: "short", day: "numeric", month: "short" });
}

/** "vendredi 30 octobre" */
export function formatDayLong(date: string): string {
  return formatMoroccoDate(date, { weekday: "long", day: "numeric", month: "long" });
}

/** "20:00" → "20h00" */
export function formatTime(time: string): string {
  return time.replace(":", "h");
}
