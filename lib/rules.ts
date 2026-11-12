// Règlement AJI TL3AB — shown on /regles and accepted once before booking.
// Changing the rules in a way players must re-accept: bump RULES_VERSION here
// AND in public.rules_version() (supabase migration).

export const RULES_VERSION = 1;

/** Refund rule (must match public.full_refund_hours() in the database). */
export const FULL_REFUND_HOURS = 24;

export const RULES_UPDATED = "13 novembre 2026";

export type RuleSection = { title: string; items: string[] };

export const RULES: RuleSection[] = [
  {
    title: "Réserver et payer",
    items: [
      "On réserve sur le site avec son compte, pour soi et éventuellement un pote (+1).",
      "La place est payée avec ton portefeuille AJI TL3AB. Tu le recharges sur WhatsApp, par virement ou en cash au terrain.",
      "Une place réservée est à toi : pas de « je passe peut-être ». Si tu réserves, tu viens.",
    ],
  },
  {
    title: "Annuler",
    items: [
      `Jusqu'à ${FULL_REFUND_HOURS} h avant le coup d'envoi : remboursé à 100 % sur ton portefeuille.`,
      `Moins de ${FULL_REFUND_HOURS} h avant : remboursé à 50 %. L'autre moitié couvre la place réservée pour toi.`,
      "Si on annule un match (météo, terrain…), tout le monde est remboursé à 100 %.",
      "Quand une place se libère, le premier joueur de la liste d'attente qui a assez de solde la récupère automatiquement.",
    ],
  },
  {
    title: "Ponctualité",
    items: [
      "Arrive 10 minutes avant le coup d'envoi pour faire les équipes.",
      "Absent sans prévenir : la place est perdue, et après plusieurs absences on peut te refuser des réservations.",
    ],
  },
  {
    title: "Fair-play",
    items: [
      "Respect de tout le monde : coéquipiers, adversaires, capitaine et équipe AJI TL3AB.",
      "Pas d'insultes, pas de violence, pas de tacles dangereux. Tolérance zéro.",
      "On joue pour s'amuser : on équilibre les équipes et tout le monde touche le ballon.",
      "Les décisions du capitaine du match (équipes, arbitrage, temps) sont respectées.",
    ],
  },
  {
    title: "Tenue et matériel",
    items: [
      "Tenue de sport et chaussures adaptées au terrain synthétique (pas de crampons vissés).",
      "Ballon et chasubles sont fournis. Pas de chaussures ? Loue une paire en réservant.",
      "Prends ta bouteille d'eau.",
    ],
  },
  {
    title: "Stats et votes",
    items: [
      "Le capitaine note les présences et les buts après le match.",
      "Les joueurs présents votent pour les meilleurs du match pendant 48 h : vote honnête, pas de vote pour un pote par principe.",
    ],
  },
];
