import type { Match } from "@/data/matches";

// Morocco runs on UTC+1 outside Ramadan (UTC+0 during Ramadan).
const MARRAKECH_OFFSET = "+01:00";
const TZ = "Africa/Casablanca";

export function matchStart(m: Match): Date {
  return m.startsAt ? new Date(m.startsAt) : new Date(`${m.date}T${m.time}:00${MARRAKECH_OFFSET}`);
}

const partsFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Marrakech local date ("2026-11-20") and time ("20:00") of an instant. */
export function marrakechParts(instant: Date | string): { date: string; time: string } {
  const p = Object.fromEntries(partsFormat.formatToParts(new Date(instant)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Marrakech local date + time → the exact instant (follows the Ramadan time change). */
export function marrakechToDate(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (t: number) => {
    const { date: ld, time: lt } = marrakechParts(new Date(t));
    const [ly, lmo, lday] = ld.split("-").map(Number);
    const [lh, lmi] = lt.split(":").map(Number);
    return Date.UTC(ly, lmo - 1, lday, lh, lmi) - t;
  };
  let t = wall - offsetAt(wall);
  t = wall - offsetAt(t);
  return new Date(t);
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
  if (m.mapsUrl) return m.mapsUrl;
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
