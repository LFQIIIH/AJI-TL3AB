// Shared client helpers for bookings, votes, leaderboard, draw and badges.

export type VoteCategory = "gardien" | "defenseur" | "milieu";
export type AwardCategory = VoteCategory | "buteur";

export const VOTE_CATEGORIES: { value: VoteCategory; label: string }[] = [
  { value: "gardien", label: "Meilleur gardien" },
  { value: "defenseur", label: "Meilleur défenseur" },
  { value: "milieu", label: "Meilleur milieu" },
];

export const AWARD_LABELS: Record<AwardCategory, string> = {
  buteur: "Meilleur buteur",
  gardien: "Meilleur gardien",
  defenseur: "Meilleur défenseur",
  milieu: "Meilleur milieu",
};

export type MatchCounts = Record<string, { booked: number; waiting: number }>;

export type Award = { match_id: string; category: AwardCategory; name: string; value: number };

export type MyStats = {
  matches: number;
  goals: number;
  best_match_goals: number;
  awards: number;
  votes_received: number;
  referral_code: string | null;
  referrals_signed_up: number;
  referrals_played: number;
  week_streak: number;
  tickets_this_month: number;
};

/** Voting opens 1 h after kick-off and closes 48 h after the match. */
export const VOTE_OPENS_AFTER_MS = 60 * 60 * 1000;
export const VOTE_CLOSES_AFTER_MS = 49 * 60 * 60 * 1000;

export function awardValueLabel(a: { category: AwardCategory; value: number }): string {
  if (a.category === "buteur") return `${a.value} ${a.value > 1 ? "buts" : "but"}`;
  return `${a.value} ${a.value > 1 ? "votes" : "vote"}`;
}

// ── Periods ──

const TZ = "Africa/Casablanca";

function todayParts(now = new Date()) {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now).split("-").map(Number);
  return { y, m };
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function currentMonthRange(now = new Date()) {
  const { y, m } = todayParts(now);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: iso(y, m, 1), to: iso(y, m, last), month: iso(y, m, 1) };
}

/** Football season: 1 September → 31 August. */
export function currentSeasonRange(now = new Date()) {
  const { y, m } = todayParts(now);
  const start = m >= 9 ? y : y - 1;
  return { from: iso(start, 9, 1), to: iso(start + 1, 8, 31), label: `${start}/${String(start + 1).slice(2)}` };
}

/** "2026-10-01" → "Octobre 2026" */
export function monthLabel(month: string): string {
  const s = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Badges ──

export type Badge = { id: string; label: string; hint: string; earned: boolean; icon: string };

export function computeBadges(s: MyStats): Badge[] {
  return [
    { id: "first", icon: "⚽", label: "Premier match", hint: "Joue ton premier match", earned: s.matches >= 1 },
    { id: "regular", icon: "🔁", label: "Habitué", hint: `10 matchs (${Math.min(s.matches, 10)}/10)`, earned: s.matches >= 10 },
    { id: "legend", icon: "👑", label: "Légende", hint: `25 matchs (${Math.min(s.matches, 25)}/25)`, earned: s.matches >= 25 },
    { id: "goal", icon: "🥅", label: "Premier but", hint: "Marque ton premier but", earned: s.goals >= 1 },
    { id: "hattrick", icon: "🎩", label: "Hat-trick", hint: "3 buts dans un match", earned: s.best_match_goals >= 3 },
    { id: "award", icon: "🏆", label: "Élu du match", hint: "Gagne un prix de match", earned: s.awards >= 1 },
    { id: "streak", icon: "🔥", label: "Série de 4", hint: `4 semaines d'affilée (${Math.min(s.week_streak, 4)}/4)`, earned: s.week_streak >= 4 },
    { id: "recruiter", icon: "🤝", label: "Recruteur", hint: `3 potes qui jouent (${Math.min(s.referrals_played, 3)}/3)`, earned: s.referrals_played >= 3 },
  ];
}

// ── Referral ──

export const REFERRAL_STORAGE_KEY = "ajitl3ab:ref";

export function readStoredReferral(): string {
  try {
    return localStorage.getItem(REFERRAL_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function storeReferral(code: string) {
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  } catch {}
}

export function clearStoredReferral() {
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {}
}
