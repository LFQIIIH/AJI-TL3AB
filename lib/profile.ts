export const POSITIONS = [
  { value: "gardien", label: "Gardien" },
  { value: "defenseur", label: "Défenseur" },
  { value: "milieu", label: "Milieu" },
  { value: "attaquant", label: "Attaquant" },
] as const;

export type Position = (typeof POSITIONS)[number]["value"];

export const LEVELS = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "confirme", label: "Confirmé" },
] as const;
export type Level = (typeof LEVELS)[number]["value"];

export const FEET = [
  { value: "droit", label: "Droit" },
  { value: "gauche", label: "Gauche" },
  { value: "les_deux", label: "Les deux" },
] as const;
export type Foot = (typeof FEET)[number]["value"];

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  position: Position;
  consent_at: string;
  birth_date: string | null;
  level: Level | null;
  preferred_foot: Foot | null;
  rules_version: number | null;
};

/** Columns read for a Profile. */
export const PROFILE_COLUMNS = "id, full_name, phone, position, consent_at, birth_date, level, preferred_foot, rules_version";

/** Booking needs these on top of name / phone / position. */
export const isProfileComplete = (p: Pick<Profile, "birth_date" | "level"> | null | undefined) => Boolean(p?.birth_date && p?.level);

export function levelLabel(l: Level | null | undefined): string {
  return LEVELS.find((x) => x.value === l)?.label ?? "";
}

/** Birth dates accepted by the database (players aged ~4 to ~86). */
export const BIRTH_DATE_MIN = "1940-01-01";
export const BIRTH_DATE_MAX = "2022-12-31";

export function positionLabel(p: Position): string {
  return POSITIONS.find((x) => x.value === p)?.label ?? p;
}

/**
 * Normalizes to E.164. Accepts Moroccan local numbers ("06 12 34 56 78"),
 * "+212 6…", "00212 6…", or any international number starting with + / 00.
 * Returns null if it doesn't look like a valid number.
 */
export function normalizePhone(raw: string): string | null {
  let s = raw.trim().replace(/[\s.\-()]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^0[5-7]\d{8}$/.test(s)) s = "+212" + s.slice(1);
  if (/^\+2120[5-7]\d{8}$/.test(s)) s = "+212" + s.slice(5);
  if (s.startsWith("+212") && !/^\+212[5-7]\d{8}$/.test(s)) return null;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

/** "+212612345678" → "+212 6 12 34 56 78" for display. */
export function formatPhone(e164: string): string {
  const m = e164.match(/^\+212(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+212 ${m.slice(1).join(" ")}` : e164;
}

/** Public-safe name: "Yassine Benali" → "Yassine B." */
export function publicName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}
