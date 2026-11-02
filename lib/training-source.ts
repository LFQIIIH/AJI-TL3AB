import { MATCHES_REVALIDATE_SECONDS, TRAINING_SHEET_CSV_URL } from "@/lib/config";
import { normalize, parseCsv, parseDate, parseTime } from "@/lib/sheet";
import { defaultSessions, SESSIONS_SHOWN, trainingSession, type TrainingSession } from "@/lib/training";

/** Rows of the "Training" tab: date, heure, terrain, quartier, note. Invalid rows are skipped. */
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
 * Upcoming training sessions from the sheet, soonest first. Falls back to the
 * default weekly schedule if the sheet isn't set up, can't be read, or has
 * nothing upcoming — the page is never empty.
 */
export async function getTrainingSessions(now: Date = new Date()): Promise<TrainingSession[]> {
  if (TRAINING_SHEET_CSV_URL) {
    try {
      const res = await fetch(TRAINING_SHEET_CSV_URL, { next: { revalidate: MATCHES_REVALIDATE_SECONDS } });
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
  return defaultSessions(SESSIONS_SHOWN, now);
}
