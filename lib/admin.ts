import { redirect } from "next/navigation";
import { formatMorocco } from "@/lib/morocco-time";
import type { MatchCategory, MatchFormat, MatchLevel } from "@/data/matches";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "captain";

export const FORMATS: MatchFormat[] = ["5v5", "7v7", "9v9"];
export const LEVELS: MatchLevel[] = ["Tous niveaux", "Débutant", "Intermédiaire", "Confirmé"];
export const CATEGORIES: { value: MatchCategory; label: string }[] = [
  { value: "mixte", label: "Mixte" },
  { value: "hommes", label: "Hommes" },
  { value: "femmes", label: "Femmes" },
  { value: "enfants", label: "Enfants" },
];
export const STATUSES = [
  { value: "published", label: "Publié" },
  { value: "draft", label: "Brouillon (invisible)" },
  { value: "cancelled", label: "Annulé" },
] as const;
export type MatchStatus = (typeof STATUSES)[number]["value"];

export type AdminMatch = {
  id: string;
  starts_at: string;
  pitch_id: string;
  format: MatchFormat;
  level: MatchLevel;
  category: MatchCategory;
  price_mad: number;
  total_spots: number;
  extra_spots: number;
  status: MatchStatus;
  captain_id: string | null;
  home_name: string | null;
  away_name: string | null;
  home_score: number | null;
  away_score: number | null;
  mvp_name: string | null;
  notes: string | null;
  publish_at: string | null;
  pitches: { name: string; area: string } | null;
};

export type Pitch = { id: string; name: string; area: string; address: string; maps_url: string | null; active: boolean };

/**
 * The signed-in staff member, or a redirect: not signed in → /connexion,
 * signed in without a staff role → /admin/acces. `adminOnly` also sends
 * captains back to the match list.
 */
export async function requireStaff(options: { adminOnly?: boolean } = {}) {
  if (!isSupabaseConfigured) redirect("/");
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/connexion");
  const { data: role } = await supabase.rpc("my_staff_role");
  if (role !== "admin" && role !== "captain") redirect("/admin/acces");
  if (options.adminOnly && role !== "admin") redirect("/admin");
  return { supabase, user: data.user, role: role as StaffRole };
}

/** Back to a page with a short message (?ok=… or ?erreur=…). */
export function back(path: string, kind: "ok" | "erreur", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

/** Database error → French message for the admin. */
export function dbMessage(error: { message?: string; code?: string } | null): string {
  const m = error?.message ?? "";
  if (m.includes("forbidden") || error?.code === "42501") return "Action réservée à l'admin.";
  if (m.includes("last_admin")) return "Impossible : il doit rester au moins un admin.";
  if (m.includes("user_not_found")) return "Aucun compte avec cet e-mail. La personne doit d'abord créer son compte sur le site.";
  if (m.includes("not_played_yet")) return "Le score se saisit après le coup d'envoi.";
  if (m.includes("invalid_amount")) return "Montant invalide.";
  if (m.includes("no_booking")) return "Réservation introuvable.";
  if (m.includes("duplicate key") || error?.code === "23505") return "Existe déjà (nom en double ?).";
  if (m.includes("violates check constraint")) return "Valeur invalide : vérifie les champs.";
  if (m.includes("violates foreign key") || error?.code === "23503") return "Élément lié introuvable ou encore utilisé.";
  return "Erreur : " + (m || "inconnue");
}

/** "jeu. 20 nov. · 20:00" (Marrakech time). */
export function formatAdminDate(iso: string): string {
  return `${formatMorocco(iso, { weekday: "short", day: "numeric", month: "short" })} · ${formatMorocco(iso, { hour: "2-digit", minute: "2-digit" })}`;
}
