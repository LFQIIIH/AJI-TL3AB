// Points, levels and monthly tiers.
// The points are computed by the database (supabase/migrations/0011_points_profiles.sql,
// function points_rule): keep POINTS below in sync with it — it's only the text shown to players.

export const POINTS: { key: string; label: string; value: number }[] = [
  { key: "played", label: "Match joué", value: 10 },
  { key: "win", label: "Victoire de ton équipe", value: 5 },
  { key: "draw", label: "Match nul", value: 2 },
  { key: "goal", label: "But", value: 3 },
  { key: "assist", label: "Passe décisive", value: 2 },
  { key: "award", label: "Élu meilleur gardien, défenseur ou milieu", value: 5 },
  { key: "streak4", label: "Chaque 4ᵉ semaine d'affilée avec un match", value: 10 },
  { key: "feedback", label: "Avis donné après le match", value: 1 },
  { key: "yellow", label: "Carton jaune", value: -3 },
  { key: "red", label: "Carton rouge", value: -10 },
  { key: "late_cancel", label: "Annulation moins de 24 h avant", value: -5 },
];

/** Level = all-time points. Level n starts at LEVEL_STARTS[n - 1]. */
const LEVEL_STARTS = [0, 50, 120, 220, 350, 520, 750, 1050, 1450, 2000];
const LEVEL_NAMES = ["Nouveau", "Habitué", "Régulier", "Titulaire", "Pilier", "Capitaine", "Cadre", "Crack", "Star", "Légende"];

export type Level = { level: number; name: string; start: number; next: number | null; progress: number };

export function levelFor(points: number): Level {
  const p = Math.max(0, points);
  let i = 0;
  while (i + 1 < LEVEL_STARTS.length && p >= LEVEL_STARTS[i + 1]) i++;
  const start = LEVEL_STARTS[i];
  const next = LEVEL_STARTS[i + 1] ?? null;
  return { level: i + 1, name: LEVEL_NAMES[i], start, next, progress: next ? (p - start) / (next - start) : 1 };
}

/** Monthly tier = points this month (resets on the 1st). */
export const TIERS = [
  { id: "diamant", label: "Diamant", min: 200, icon: "💎" },
  { id: "or", label: "Or", min: 120, icon: "🥇" },
  { id: "argent", label: "Argent", min: 60, icon: "🥈" },
  { id: "bronze", label: "Bronze", min: 20, icon: "🥉" },
] as const;

export type Tier = (typeof TIERS)[number];

export function tierFor(monthPoints: number): Tier | null {
  return TIERS.find((t) => monthPoints >= t.min) ?? null;
}

/** Next tier above the current one (null at the top). */
export function nextTier(monthPoints: number): Tier | null {
  return [...TIERS].reverse().find((t) => monthPoints < t.min) ?? null;
}

export const playerPath = (code: string) => `/joueur/${code}`;

/** French ordinal: 1er, 2ᵉ, 3ᵉ… */
export const ordinal = (n: number) => (n === 1 ? "1er" : `${n}ᵉ`);
