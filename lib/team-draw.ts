// Random teams, team names and jersey numbers (admin "Tirage des équipes").

export type DrawPlayer = { name: string; number: number; user_id: string | null };
export type DrawTeam = { name: string; players: DrawPlayer[] };
export type TeamDraw = { teams: DrawTeam[]; drawn_at: string };
export type DrawEntrant = { name: string; user_id: string | null; goalkeeper?: boolean };

export const TEAM_NAMES = [
  "Vikings",
  "Lions de l'Atlas",
  "Dragons",
  "Fighters",
  "Titans",
  "Requins",
  "Éclairs",
  "Conquérants",
  "Faucons",
  "Panthères",
  "Scorpions",
  "Aigles",
];

/** Uniform random integer in [0, n), from the browser's crypto when available. */
function randomInt(n: number): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n; // rejection sampling: no bias
    do crypto.getRandomValues(buf);
    while (buf[0] >= limit);
    return buf[0] % n;
  }
  return Math.floor(Math.random() * n);
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Splits entrants into `count` teams of equal size (±1), goalkeepers spread
 * first so two don't end up together; random team names; jersey numbers
 * 1–99, all different.
 */
export function drawTeams(entrants: DrawEntrant[], count: number): TeamDraw {
  const keepers = shuffle(entrants.filter((e) => e.goalkeeper));
  const others = shuffle(entrants.filter((e) => !e.goalkeeper));
  const buckets: DrawEntrant[][] = Array.from({ length: count }, () => []);
  // Keepers round-robin, then everyone else always to the smallest team (ties at random).
  keepers.forEach((k, i) => buckets[i % count].push(k));
  for (const e of others) {
    const min = Math.min(...buckets.map((b) => b.length));
    const smallest = shuffle(buckets.filter((b) => b.length === min));
    smallest[0].push(e);
  }
  const numbers = shuffle(Array.from({ length: 99 }, (_, i) => i + 1));
  let next = 0;
  const names = shuffle(TEAM_NAMES).slice(0, count);
  return {
    drawn_at: new Date().toISOString(),
    teams: buckets.map((b, i) => ({
      name: names[i],
      players: b.map((e) => ({ name: e.name, user_id: e.user_id, number: numbers[next++] })).sort((x, y) => x.number - y.number),
    })),
  };
}

/** Text for WhatsApp: one block per team, "#7 Yassine B.". */
export function drawText(draw: TeamDraw, title: string): string {
  return [
    `⚽ ${title}`,
    ...draw.teams.map((t) => [``, `*${t.name}*`, ...t.players.map((p) => `#${p.number} ${p.name}`)].join("\n")),
  ].join("\n");
}
