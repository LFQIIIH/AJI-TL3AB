// Morocco (Marrakech) local time, independent of the server's time-zone data.
//
// Morocco moved to permanent UTC+0 on 2026-09-20 (IANA tzdata 2026c+). Older
// tzdata (e.g. the ICU data bundled with some Node.js versions) still says
// UTC+1, which would shift every match by an hour. So: from the switch on, the
// offset is hard-coded to 0; before it (past matches only), the runtime's data
// is used — it is correct for those dates in every recent version.

export const MOROCCO_TZ = "Africa/Casablanca";

/** 2026-09-20 02:00 local (UTC+1) = 01:00 UTC: Morocco on UTC+0 for good. */
const PERMANENT_UTC_FROM = Date.UTC(2026, 8, 20, 1, 0);

const historicFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: MOROCCO_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Offset of Morocco from UTC at instant `t` (ms since epoch), in ms. */
export function moroccoOffsetMs(t: number): number {
  if (t >= PERMANENT_UTC_FROM) return 0;
  const p = Object.fromEntries(historicFormat.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  return wall - Math.floor(t / 60000) * 60000;
}

/** The instant shifted so that its UTC fields read as Morocco wall-clock time. */
function wallClock(instant: Date | string | number): Date {
  const t = new Date(instant).getTime();
  return new Date(t + moroccoOffsetMs(t));
}

/** Morocco local date ("2026-11-20") and time ("20:00") of an instant. */
export function moroccoParts(instant: Date | string | number): { date: string; time: string } {
  const iso = wallClock(instant).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** Morocco local date + time → the exact instant. */
export function moroccoToDate(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let t = wall - moroccoOffsetMs(wall);
  t = wall - moroccoOffsetMs(t);
  return new Date(t);
}

/** Today's date in Morocco, "YYYY-MM-DD". */
export function moroccoToday(now: Date = new Date()): string {
  return moroccoParts(now).date;
}

/** Intl formatting of an instant in Morocco time (e.g. "jeu. 20 nov.", "20:00"). */
export function formatMorocco(instant: Date | string | number, options: Intl.DateTimeFormatOptions, locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(wallClock(instant));
}

/** Intl formatting of a calendar date ("2026-11-20"), e.g. "vendredi 20 novembre". */
export function formatMoroccoDate(date: string, options: Intl.DateTimeFormatOptions, locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
