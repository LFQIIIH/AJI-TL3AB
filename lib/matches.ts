import { matches, type Match } from "@/data/matches";

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

export function getUpcomingMatches(limit?: number, now: Date = new Date()): Match[] {
  const upcoming = matches
    .filter((m) => matchStart(m) > now)
    .sort((a, b) => matchStart(a).getTime() - matchStart(b).getTime());
  return limit ? upcoming.slice(0, limit) : upcoming;
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
