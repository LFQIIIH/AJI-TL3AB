export type MatchFormat = "5v5" | "7v7" | "9v9";
export type MatchLevel = "Débutant" | "Intermédiaire" | "Confirmé" | "Tous niveaux";

export type Match = {
  id: string;
  /** YYYY-MM-DD, Marrakech local date */
  date: string;
  /** HH:mm, Marrakech local time */
  time: string;
  pitch: string;
  area: string;
  format: MatchFormat;
  level: MatchLevel;
  priceMad: number;
  totalSpots: number;
  spotsTaken: number;
};

// Placeholder data — swap for an API / CMS later.
export const matches: Match[] = [
  { id: "m-001", date: "2026-10-30", time: "20:00", pitch: "Urban Foot", area: "Guéliz", format: "5v5", level: "Tous niveaux", priceMad: 50, totalSpots: 10, spotsTaken: 7 },
  { id: "m-002", date: "2026-10-30", time: "22:00", pitch: "Five Arena", area: "Targa", format: "5v5", level: "Confirmé", priceMad: 50, totalSpots: 10, spotsTaken: 10 },
  { id: "m-003", date: "2026-10-31", time: "18:30", pitch: "Complexe Massira", area: "Massira", format: "7v7", level: "Intermédiaire", priceMad: 60, totalSpots: 14, spotsTaken: 9 },
  { id: "m-004", date: "2026-11-01", time: "10:00", pitch: "Terrain Agdal", area: "Agdal", format: "9v9", level: "Confirmé", priceMad: 70, totalSpots: 18, spotsTaken: 12 },
  { id: "m-005", date: "2026-11-01", time: "19:00", pitch: "Urban Foot", area: "Guéliz", format: "7v7", level: "Tous niveaux", priceMad: 60, totalSpots: 14, spotsTaken: 5 },
  { id: "m-006", date: "2026-11-02", time: "21:00", pitch: "Five Arena", area: "Targa", format: "5v5", level: "Débutant", priceMad: 50, totalSpots: 10, spotsTaken: 3 },
  { id: "m-007", date: "2026-11-03", time: "20:30", pitch: "Stade Daoudiate", area: "Daoudiate", format: "7v7", level: "Intermédiaire", priceMad: 60, totalSpots: 14, spotsTaken: 14 },
  { id: "m-008", date: "2026-11-04", time: "19:30", pitch: "Soccer Park", area: "Hivernage", format: "5v5", level: "Tous niveaux", priceMad: 55, totalSpots: 10, spotsTaken: 1 },
];
