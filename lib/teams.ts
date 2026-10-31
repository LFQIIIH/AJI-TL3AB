// Team identities for match results. A match's two teams come from the
// sheet's equipe_1 / equipe_2 columns, or are picked automatically.

export type TeamEmblem = "helmet" | "swords" | "shield" | "paw" | "fin" | "flame" | "bolt" | "hammer";

export const TEAMS: { name: string; emblem: TeamEmblem }[] = [
  { name: "Vikings", emblem: "helmet" },
  { name: "Conquérants", emblem: "swords" },
  { name: "Fighters", emblem: "shield" },
  { name: "Lions de l'Atlas", emblem: "paw" },
  { name: "Requins", emblem: "fin" },
  { name: "Dragons", emblem: "flame" },
  { name: "Éclairs", emblem: "bolt" },
  { name: "Titans", emblem: "hammer" },
];

const key = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

/** Emblem for a team name; names not in the list get the shield. */
export function teamEmblem(name: string): TeamEmblem {
  const k = key(name);
  return TEAMS.find((t) => key(t.name) === k || k.startsWith(key(t.name).slice(0, 5)))?.emblem ?? "shield";
}

/** The canonical spelling if the name matches a known team ("vikings" → "Vikings"). */
export function canonicalTeamName(name: string): string {
  const k = key(name);
  return TEAMS.find((t) => key(t.name) === k)?.name ?? name.trim();
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Two different teams, always the same for a given match. */
export function defaultTeams(matchId: string): [string, string] {
  const h = hash(matchId);
  const a = h % TEAMS.length;
  const b = (a + 1 + ((h >>> 8) % (TEAMS.length - 1))) % TEAMS.length;
  return [TEAMS[a].name, TEAMS[b].name];
}
