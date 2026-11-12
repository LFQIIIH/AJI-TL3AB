import { whatsappLink } from "@/lib/config";

export type WalletTx = {
  id: number;
  amount_mad: number;
  kind: "topup" | "booking" | "refund" | "adjustment";
  method: string | null;
  match_id: string | null;
  note: string | null;
  created_at: string;
};

export const TX_LABEL: Record<WalletTx["kind"], string> = {
  topup: "Recharge",
  booking: "Match payé",
  refund: "Remboursement",
  adjustment: "Correction",
};

export const METHOD_LABEL: Record<string, string> = {
  cash: "cash",
  virement: "virement",
  whatsapp: "WhatsApp",
  autre: "autre",
};

/** Suggested top-up amounts (MAD). */
export const TOPUP_AMOUNTS = [100, 200, 300, 500];

/** "+100 MAD" / "−70 MAD" */
export const signedMad = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)} MAD`;

/** WhatsApp message to ask for a top-up. */
export function topupLink(amount: number, name: string, phone: string): string {
  return whatsappLink(
    [
      "Salam AJI TL3AB ! Bghit nrecharge mon portefeuille 💳",
      "",
      `💰 Montant : ${amount} MAD`,
      `👤 Nom : ${name}`,
      `📱 Tél : ${phone}`,
      "",
      "Je paie par : virement / cash (à préciser)",
    ].join("\n"),
  );
}
