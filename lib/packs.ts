// "Pack Régulier" — the offer is enforced by the database (supabase/migrations/0020_packs.sql,
// function pack_offer): keep these numbers in sync, they're only the text shown on the site.
import { whatsappLink } from "@/lib/config";
import { formatMorocco } from "@/lib/morocco-time";

export const PACK = {
  name: "Pack Régulier",
  matches: 4,
  trainings: 4,
  priceMad: 325,
  /** 4 × 7v7 at 60 + 4 trainings at 50. */
  listPriceMad: 440,
  validDays: 30,
  formats: ["5v5", "7v7"] as const,
};

export const PACK_SAVING_MAD = PACK.listPriceMad - PACK.priceMad;

export type MyPack = {
  id: number;
  match_left: number;
  training_left: number;
  match_tickets: number;
  training_tickets: number;
  expires_at: string;
  created_at: string;
};

export const packEligible = (format: string) => (PACK.formats as readonly string[]).includes(format);

/** Last valid day ("26 déc."): the pack ends at midnight, Marrakech time. */
export const packLastDay = (expiresAt: string) =>
  formatMorocco(new Date(new Date(expiresAt).getTime() - 1000).toISOString(), { day: "numeric", month: "short" });

/** The pack that a booking at `start` would use (earliest expiry first), if any. */
export function packFor(packs: MyPack[], kind: "match" | "training", start: Date): MyPack | null {
  return (
    [...packs]
      .sort((a, b) => a.expires_at.localeCompare(b.expires_at))
      .find((p) => (kind === "match" ? p.match_left : p.training_left) > 0 && new Date(p.expires_at) > start) ?? null
  );
}

/** "3 matchs · 2 trainings" */
export function ticketsLine(matches: number, trainings: number) {
  const part = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;
  return `${part(matches, "match")} · ${part(trainings, "training")}`;
}

/** A row of admin_packs (sales list). */
export type AdminPack = {
  id: number;
  user_id: string;
  full_name: string;
  phone: string;
  price_mad: number;
  method: string | null;
  note: string | null;
  match_used: number;
  match_tickets: number;
  training_used: number;
  training_tickets: number;
  created_at: string;
  expires_at: string;
  cancelled_at: string | null;
  sold_by: string | null;
};

/** WhatsApp message to buy the pack (name / phone when signed in). */
export function packRequestLink(name?: string, phone?: string): string {
  return whatsappLink(
    [
      `Salam AJI TL3AB ! Bghit ${PACK.name} 🎟️`,
      "",
      `${PACK.matches} matchs + ${PACK.trainings} trainings · ${PACK.priceMad} MAD`,
      ...(name ? [`👤 Nom : ${name}`] : []),
      ...(phone ? [`📱 Tél : ${phone}`] : []),
      "",
      "Je paie par : virement / cash (à préciser)",
    ].join("\n"),
  );
}
