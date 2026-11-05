import { MATCHES_REVALIDATE_SECONDS, SWITCHOFF_SHEET_CSV_URL, TRAINING_SHEET_CSV_URL } from "@/lib/config";
import { SWITCHOFF_TIME, SWITCHOFF_WEEKDAYS } from "@/lib/switchoff";
import { normalize, parseCsv, parseDate, parseTime } from "@/lib/sheet";
import { defaultSessions, SESSIONS_SHOWN, trainingSession, type TrainingSession } from "@/lib/training";

/** Rows of a sessions tab ("Training", "SwitchOff"): date, heure, terrain, quartier, note. Invalid rows are skipped. */
export function sheetToSessions(csv: string): TrainingSession[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return [];
  const col = new Map(header.map((h, i) => [normalize(h), i]));
  const get = (row: string[], name: string) => {
    const i = col.get(name);
    return i === undefined ? "" : (row[i] ?? "").trim();
  };
  const sessions: TrainingSession[] = [];
  for (const row of rows) {
    const date = parseDate(get(row, "date"));
    const time = parseTime(get(row, "heure"));
    if (!date || !time) continue;
    sessions.push(trainingSession(date, time, get(row, "terrain"), get(row, "quartier"), get(row, "note")));
  }
  return sessions;
}

/**
 * Upcoming sessions from a sheet tab, soonest first. Falls back to `fallback`
 * if the tab isn't set up, can't be read, or has nothing upcoming — the page
 * is never empty.
 */
async function getSheetSessions(url: string, fallback: () => TrainingSession[], now: Date): Promise<TrainingSession[]> {
  if (url) {
    try {
      const res = await fetch(url, { next: { revalidate: MATCHES_REVALIDATE_SECONDS } });
      if (res.ok) {
        const seen = new Set<string>();
        const upcoming = sheetToSessions(await res.text())
          .filter((s) => new Date(s.start) > now && !seen.has(s.id) && seen.add(s.id))
          .sort((a, b) => a.start.localeCompare(b.start));
        if (upcoming.length) return upcoming.slice(0, 12);
      }
    } catch {
      // fall through to the default schedule
    }
  }
  return fallback();
}

/** Training sessions ("Training" tab), default mardi/jeudi/samedi 19:00. */
export function getTrainingSessions(now: Date = new Date()): Promise<TrainingSession[]> {
  return getSheetSessions(TRAINING_SHEET_CSV_URL, () => defaultSessions(SESSIONS_SHOWN, now), now);
}

/** Switch Off sessions ("SwitchOff" tab), default samedi/dimanche 09:00. */
export function getSwitchOffSessions(now: Date = new Date()): Promise<TrainingSession[]> {
  return getSheetSessions(
    SWITCHOFF_SHEET_CSV_URL,
    () => defaultSessions(SESSIONS_SHOWN, now, SWITCHOFF_WEEKDAYS, SWITCHOFF_TIME),
    now,
  );
}
