import type { Match, MatchFormat, MatchLevel } from "@/data/matches";

/** Minimal RFC 4180 CSV parser (handles quoted fields, "" escapes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Lowercase, strip accents and non-alphanumerics: "Réservées " → "reservees". */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** "07/11/2026", "7/11/2026" or "2026-11-07" → "2026-11-07" */
function parseDate(raw: string): string | null {
  const s = raw.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (match) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "20:00", "20:00:00", "20h", "20h30", "9:30" → "HH:mm" */
function parseTime(raw: string): string | null {
  const match = raw.trim().toLowerCase().match(/^(\d{1,2})\s*[:h]\s*(\d{2})?(?::\d{2})?$/);
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseCount(raw: string | undefined): number | null {
  const s = (raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

const FORMATS: Record<string, MatchFormat> = { "5v5": "5v5", "7v7": "7v7", "9v9": "9v9" };
const LEVELS: Record<string, MatchLevel> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  confirme: "Confirmé",
  tousniveaux: "Tous niveaux",
};

/**
 * Turns the "Matchs" sheet CSV into matches. Header names are matched loosely
 * (case/accents ignored). Rows that are incomplete or invalid are skipped.
 */
export function sheetToMatches(csv: string): Match[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return [];
  const col = new Map(header.map((h, i) => [normalize(h), i]));
  const get = (row: string[], name: string) => {
    const i = col.get(name);
    return i === undefined ? "" : (row[i] ?? "").trim();
  };

  const matches: Match[] = [];
  for (const row of rows) {
    const date = parseDate(get(row, "date"));
    const time = parseTime(get(row, "heure"));
    const pitch = get(row, "terrain");
    const format = FORMATS[normalize(get(row, "format"))];
    const price = parseCount(get(row, "prix"));
    const totalSpots = parseCount(get(row, "places"));
    if (!date || !time || !pitch || !format || price === null || !totalSpots) continue;

    const scoreLime = parseCount(get(row, "scorelime"));
    const scoreNoir = parseCount(get(row, "scorenoir"));
    const mvp = get(row, "mvp");

    matches.push({
      id: `${date}-${time}-${normalize(pitch)}`,
      date,
      time,
      pitch,
      area: get(row, "quartier"),
      format,
      level: LEVELS[normalize(get(row, "niveau"))] ?? "Tous niveaux",
      priceMad: price,
      totalSpots,
      spotsTaken: Math.min(totalSpots, parseCount(get(row, "reservees")) ?? 0),
      result:
        scoreLime !== null && scoreNoir !== null
          ? {
              home: { name: "Lime", score: scoreLime },
              away: { name: "Noir", score: scoreNoir },
              ...(mvp ? { mvp } : {}),
            }
          : undefined,
    });
  }
  return matches;
}
