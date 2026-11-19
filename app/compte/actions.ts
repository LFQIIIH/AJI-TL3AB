"use server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  BIRTH_DATE_MAX,
  BIRTH_DATE_MIN,
  FEET,
  LEVELS,
  normalizePhone,
  POSITIONS,
  PROFILE_COLUMNS,
  type Profile,
} from "@/lib/profile";

export type ProfileInput = {
  fullName: string;
  phone: string;
  position: string;
  birthDate: string;
  level: string;
  foot: string;
  consent: boolean;
  referral?: string;
};

export type SaveProfileResult = { profile: Profile } | { error: string };

/**
 * Saves the signed-in player's profile from the server (with the session
 * cookie), so the save doesn't depend on the phone's own connection to the
 * database. Same rules as the database, checked first for clear messages.
 */
export async function saveProfile(input: ProfileInput): Promise<SaveProfileResult> {
  if (!isSupabaseConfigured) return { error: "Service indisponible pour l'instant." };
  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Ta session a expiré. Reconnecte-toi puis réessaie." };

  const fullName = String(input.fullName ?? "").trim().replace(/\s+/g, " ");
  const phone = normalizePhone(String(input.phone ?? ""));
  if (fullName.length < 2 || fullName.length > 80) return { error: "Ton nom doit faire entre 2 et 80 caractères." };
  if (!phone) return { error: "Numéro de téléphone invalide. Exemple : 06 12 34 56 78." };
  if (!POSITIONS.some((p) => p.value === input.position)) return { error: "Choisis ton poste." };
  if (!(input.birthDate >= BIRTH_DATE_MIN && input.birthDate <= BIRTH_DATE_MAX)) return { error: "Date de naissance invalide." };
  if (!LEVELS.some((l) => l.value === input.level)) return { error: "Choisis ton niveau." };
  if (input.foot && !FEET.some((f) => f.value === input.foot)) return { error: "Pied préféré invalide." };

  const { data: existing } = await supabase.from("profiles").select("consent_at").eq("id", auth.user.id).maybeSingle();
  if (!existing && !input.consent) return { error: "Accepte la politique de confidentialité pour créer ton profil." };

  const referral = String(input.referral ?? "").trim().slice(0, 20);
  const row = {
    id: auth.user.id,
    full_name: fullName,
    phone,
    position: input.position,
    birth_date: input.birthDate,
    level: input.level,
    preferred_foot: input.foot || null,
    consent_at: existing?.consent_at ?? new Date().toISOString(),
    ...(!existing && referral ? { referral_input: referral } : {}),
  };
  const { data, error } = await supabase.from("profiles").upsert(row).select(PROFILE_COLUMNS).single<Profile>();
  if (error) {
    // Shows up in the Vercel logs (no personal data: code and message only).
    console.error("saveProfile failed", error.code, error.message);
    if (error.message.includes("check constraint")) return { error: "Une info n'est pas acceptée. Vérifie la date, le niveau et le téléphone." };
    return { error: `L'enregistrement a échoué (${error.code || "erreur serveur"}). Réessaie dans un instant.` };
  }
  return { profile: data };
}
