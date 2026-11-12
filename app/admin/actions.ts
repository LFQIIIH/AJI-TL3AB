"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { back, CATEGORIES, dbMessage, FORMATS, LEVELS, requireStaff, STATUSES } from "@/lib/admin";
import { marrakechToDate, matchStart } from "@/lib/matches";
import { getSheetMatchesForImport, MATCHES_TAG } from "@/lib/matches-source";

// Every change refreshes the public pages right away (instead of within 5 min).
function refreshSite() {
  revalidateTag(MATCHES_TAG);
  for (const path of ["/", "/jouer", "/classement", "/compte"]) revalidatePath(path);
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => {
  const n = Number(str(f, k));
  return Number.isFinite(n) ? Math.round(n) : NaN;
};

/** Match fields from the form, validated. Returns an error message or the row. */
function matchFromForm(f: FormData) {
  const date = str(f, "date");
  const time = str(f, "time");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return "Date ou heure invalide.";
  const format = str(f, "format");
  const level = str(f, "level");
  const category = str(f, "category");
  const status = str(f, "status");
  if (!FORMATS.includes(format as never)) return "Format invalide.";
  if (!LEVELS.includes(level as never)) return "Niveau invalide.";
  if (!CATEGORIES.some((c) => c.value === category)) return "Catégorie invalide.";
  if (!STATUSES.some((s) => s.value === status)) return "Statut invalide.";
  const price = int(f, "price_mad");
  const total = int(f, "total_spots");
  const extra = int(f, "extra_spots") || 0;
  if (!(price >= 0 && price <= 2000)) return "Prix invalide (0 à 2000 MAD).";
  if (!(total >= 2 && total <= 40)) return "Places invalides (2 à 40).";
  if (!(extra >= 0 && extra <= total)) return "Places hors site : entre 0 et le total.";
  const pitchId = str(f, "pitch_id");
  if (!pitchId) return "Choisis un terrain.";
  return {
    starts_at: marrakechToDate(date, time).toISOString(),
    pitch_id: pitchId,
    format,
    level,
    category,
    status,
    price_mad: price,
    total_spots: total,
    extra_spots: extra,
    captain_id: str(f, "captain_id") || null,
    notes: str(f, "notes") || null,
  };
}

export async function createMatch(f: FormData) {
  const { supabase } = await requireStaff({ adminOnly: true });
  const row = matchFromForm(f);
  if (typeof row === "string") back("/admin/matchs/nouveau", "erreur", row);
  const { data, error } = await supabase.from("matches").insert(row).select("id").single();
  if (error) back("/admin/matchs/nouveau", "erreur", dbMessage(error));
  refreshSite();
  back(`/admin/matchs/${encodeURIComponent(data.id)}`, "ok", "Match créé.");
}

export async function updateMatch(f: FormData) {
  const { supabase } = await requireStaff({ adminOnly: true });
  const id = str(f, "id");
  const path = `/admin/matchs/${encodeURIComponent(id)}`;
  const row = matchFromForm(f);
  if (typeof row === "string") back(path, "erreur", row);
  const { error } = await supabase.from("matches").update(row).eq("id", id);
  if (error) back(path, "erreur", dbMessage(error));
  refreshSite();
  back(path, "ok", "Match enregistré.");
}

/** Same match one week later (as a draft-free copy, no result, no captain change). */
export async function duplicateMatch(f: FormData) {
  const { supabase } = await requireStaff({ adminOnly: true });
  const id = str(f, "id");
  const days = Math.min(60, Math.max(1, int(f, "days") || 7));
  const { data: m, error } = await supabase.from("matches").select("*").eq("id", id).single();
  if (error || !m) back("/admin", "erreur", dbMessage(error));
  const startsAt = new Date(new Date(m.starts_at).getTime() + days * 86400000).toISOString();
  const { data: copy, error: insertError } = await supabase
    .from("matches")
    .insert({
      starts_at: startsAt,
      pitch_id: m.pitch_id,
      format: m.format,
      level: m.level,
      category: m.category,
      price_mad: m.price_mad,
      total_spots: m.total_spots,
      extra_spots: 0,
      status: m.status === "cancelled" ? "published" : m.status,
      captain_id: m.captain_id,
      notes: m.notes,
    })
    .select("id")
    .single();
  if (insertError) back(`/admin/matchs/${encodeURIComponent(id)}`, "erreur", dbMessage(insertError));
  refreshSite();
  back(`/admin/matchs/${encodeURIComponent(copy.id)}`, "ok", `Copie créée (+${days} jours). Vérifie et ajuste.`);
}

export async function setMatchStatus(f: FormData) {
  const { supabase } = await requireStaff({ adminOnly: true });
  const id = str(f, "id");
  const status = str(f, "status");
  const path = `/admin/matchs/${encodeURIComponent(id)}`;
  if (!STATUSES.some((s) => s.value === status)) back(path, "erreur", "Statut invalide.");
  const { error } = await supabase.from("matches").update({ status }).eq("id", id);
  if (error) back(path, "erreur", dbMessage(error));
  refreshSite();
  back(path, "ok", status === "cancelled" ? "Match annulé (masqué du site). Préviens les joueurs inscrits." : "Statut mis à jour.");
}

export async function deleteMatch(f: FormData) {
  const { supabase } = await requireStaff({ adminOnly: true });
  const id = str(f, "id");
  const { data, error } = await supabase.from("matches").delete().eq("id", id).select("id");
  if (error) back(`/admin/matchs/${encodeURIComponent(id)}`, "erreur", dbMessage(error));
  if (!data?.length) back(`/admin/matchs/${encodeURIComponent(id)}`, "erreur", "Impossible : des joueurs sont inscrits. Annule le match à la place.");
  refreshSite();
  back("/admin", "ok", "Match supprimé.");
}

// ── Roster & result (admin or the match's captain) ──

export async function updateBooking(f: FormData) {
  const { supabase } = await requireStaff();
  const matchId = str(f, "match_id");
  const path = `/admin/matchs/${encodeURIComponent(matchId)}`;
  const goals = int(f, "goals");
  const { error } = await supabase.rpc("staff_update_booking", {
    p_match_id: matchId,
    p_user_id: str(f, "user_id"),
    p_attended: f.get("attended") === "on",
    p_goals: Number.isFinite(goals) ? goals : 0,
  });
  if (error) back(path, "erreur", dbMessage(error));
  refreshSite();
  back(path, "ok", "Présence et buts enregistrés.");
}

export async function setResult(f: FormData) {
  const { supabase } = await requireStaff();
  const matchId = str(f, "match_id");
  const path = `/admin/matchs/${encodeURIComponent(matchId)}`;
  const home = str(f, "home_score");
  const away = str(f, "away_score");
  const clear = home === "" && away === "";
  if (!clear && !(/^\d{1,2}$/.test(home) && /^\d{1,2}$/.test(away))) back(path, "erreur", "Score invalide (0 à 99 de chaque côté).");
  const { error } = await supabase.rpc("staff_set_result", {
    p_match_id: matchId,
    p_home_name: str(f, "home_name"),
    p_home_score: clear ? null : Number(home),
    p_away_name: str(f, "away_name"),
    p_away_score: clear ? null : Number(away),
    p_mvp_name: str(f, "mvp_name"),
  });
  if (error) back(path, "erreur", dbMessage(error));
  refreshSite();
  back(path, "ok", clear ? "Score effacé." : "Score enregistré.");
}

// ── Pitches ──

function pitchFromForm(f: FormData) {
  const name = str(f, "name");
  const mapsUrl = str(f, "maps_url");
  if (name.length < 2) return "Nom du terrain trop court.";
  if (mapsUrl && !mapsUrl.startsWith("https://")) return "Le lien Maps doit commencer par https://";
  return { name, area: str(f, "area"), address: str(f, "address"), maps_url: mapsUrl || null, active: f.get("active") !== null };
}

export async function savePitch(f: FormData) {
  const { supabase } = await requireStaff({ adminOnly: true });
  const id = str(f, "id");
  const row = pitchFromForm(f);
  if (typeof row === "string") back("/admin/terrains", "erreur", row);
  const { error } = id
    ? await supabase.from("pitches").update(row).eq("id", id)
    : await supabase.from("pitches").insert({ ...row, active: true });
  if (error) back("/admin/terrains", "erreur", dbMessage(error));
  refreshSite();
  back("/admin/terrains", "ok", id ? "Terrain enregistré." : "Terrain ajouté.");
}

// ── Staff ──

export async function setStaff(f: FormData) {
  const { supabase } = await requireStaff({ adminOnly: true });
  const role = str(f, "role");
  const { error } = await supabase.rpc("admin_set_staff", { p_email: str(f, "email"), p_role: role === "remove" ? null : role });
  if (error) back("/admin/equipe", "erreur", dbMessage(error));
  back("/admin/equipe", "ok", role === "remove" ? "Accès retiré." : "Accès mis à jour.");
}

// ── One-click import of the Google Sheet ──

export async function importSheet() {
  const { supabase } = await requireStaff({ adminOnly: true });
  let sheet;
  try {
    sheet = await getSheetMatchesForImport();
  } catch {
    back("/admin", "erreur", "Impossible de lire le Google Sheet.");
  }
  if (!sheet.length) back("/admin", "erreur", "Le Google Sheet ne contient aucun match.");

  // Pitches by name, ignoring case and spaces ("Zahi Foot" = "zahi foot"):
  // the first spelling is kept, existing pitches are reused.
  const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");
  const { data: existing, error: existingError } = await supabase.from("pitches").select("id, name");
  if (existingError || !existing) back("/admin", "erreur", dbMessage(existingError));
  const pitchId = new Map(existing.map((p) => [key(p.name), p.id as string]));
  const missing = new Map<string, { name: string; area: string }>();
  for (const m of sheet) if (!pitchId.has(key(m.pitch)) && !missing.has(key(m.pitch))) missing.set(key(m.pitch), { name: m.pitch.trim(), area: m.area });
  if (missing.size) {
    const { data: added, error: pitchError } = await supabase.from("pitches").insert([...missing.values()]).select("id, name");
    if (pitchError || !added) back("/admin", "erreur", dbMessage(pitchError));
    for (const p of added) pitchId.set(key(p.name), p.id);
  }

  // Matches keep the sheet's ids so bookings, votes and stats stay linked.
  // Two sheet rows with the same id (same date, time and pitch) are the same
  // match for the site: the last row wins.
  const byId = new Map<string, (typeof sheet)[number]>();
  for (const m of sheet) byId.set(m.id, m);
  const duplicates = sheet.length - byId.size;
  const rows = [...byId.values()].map((m) => ({
    id: m.id,
    starts_at: matchStart(m).toISOString(),
    pitch_id: pitchId.get(key(m.pitch))!,
    format: m.format,
    level: m.level,
    price_mad: m.priceMad,
    total_spots: Math.min(40, Math.max(2, m.totalSpots)),
    extra_spots: Math.min(m.spotsTaken, Math.min(40, Math.max(2, m.totalSpots))),
    status: "published",
    home_name: m.result?.home.name ?? null,
    away_name: m.result?.away.name ?? null,
    home_score: m.result?.home.score ?? null,
    away_score: m.result?.away.score ?? null,
    mvp_name: m.result?.mvp ?? null,
  }));
  const { error } = await supabase.from("matches").upsert(rows, { onConflict: "id" });
  if (error) back("/admin", "erreur", dbMessage(error));
  refreshSite();
  back(
    "/admin",
    "ok",
    `${rows.length} matchs importés` +
      (missing.size ? `, ${missing.size} terrains ajoutés` : "") +
      (duplicates ? `, ${duplicates} doublons du Sheet ignorés (même date, heure et terrain)` : "") +
      ". Tu peux passer MATCHES_SOURCE=supabase dans Vercel.",
  );
}

export async function signOutAdmin() {
  const { supabase } = await requireStaff();
  await supabase.auth.signOut();
  redirect("/");
}

// ── Players & wallets (admin) ──

export async function walletAdd(f: FormData) {
  const { supabase } = await requireStaff({ adminOnly: true });
  const userId = str(f, "user_id");
  const path = `/admin/joueurs?joueur=${encodeURIComponent(userId)}&q=${encodeURIComponent(str(f, "q"))}`;
  const amount = int(f, "amount");
  const sign = str(f, "kind") === "correction" ? -1 : 1;
  if (!(amount > 0 && amount <= 100000)) back(path, "erreur", "Montant invalide.");
  const { data, error } = await supabase.rpc("admin_wallet_add", {
    p_user: userId,
    p_amount: sign * amount,
    p_method: sign > 0 ? str(f, "method") : "autre",
    p_note: str(f, "note"),
  });
  if (error) back(path, "erreur", dbMessage(error));
  revalidatePath("/compte");
  back(path, "ok", `${sign > 0 ? "Recharge" : "Correction"} de ${amount} MAD enregistrée. Nouveau solde : ${data} MAD.`);
}

export async function setTrusted(f: FormData) {
  const { supabase } = await requireStaff({ adminOnly: true });
  const userId = str(f, "user_id");
  const path = `/admin/joueurs?joueur=${encodeURIComponent(userId)}&q=${encodeURIComponent(str(f, "q"))}`;
  const trusted = str(f, "trusted") === "1";
  const { error } = await supabase.rpc("admin_set_trusted", { p_user: userId, p_trusted: trusted });
  if (error) back(path, "erreur", dbMessage(error));
  back(path, "ok", trusted ? "Joueur de confiance : il peut réserver et payer sur place." : "Joueur de confiance retiré.");
}
