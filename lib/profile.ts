export const POSITIONS = [
  { value: "gardien", label: "Gardien" },
  { value: "defenseur", label: "Défenseur" },
  { value: "milieu", label: "Milieu" },
  { value: "attaquant", label: "Attaquant" },
] as const;

export type Position = (typeof POSITIONS)[number]["value"];

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  position: Position;
  consent_at: string;
};

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
