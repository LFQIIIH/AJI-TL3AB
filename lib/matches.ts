import type { Match } from "@/data/matches";

// Morocco runs on UTC+1 outside Ramadan.
const MARRAKECH_OFFSET = "+01:00";
const TZ = "Africa/Casablanca";

export function matchStart(m: Match): Date {
  return new Date(`${m.date}T${m.time}:00${MARRAKECH_OFFSET}`);
}

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
  const query = [m.pitch, m.area, "Marrakech"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Today's date in Marrakech as YYYY-MM-DD. */
function marrakechToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

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
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  }).format(new Date(`${date}T12:00:00${MARRAKECH_OFFSET}`));
}

/** "vendredi 30 octobre" */
export function formatDayLong(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(new Date(`${date}T12:00:00${MARRAKECH_OFFSET}`));
}

/** "20:00" → "20h00" */
export function formatTime(time: string): string {
  return time.replace(":", "h");
}
