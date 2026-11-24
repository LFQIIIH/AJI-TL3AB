import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { avatarUrl } from "@/lib/avatar";
import { CARD, cardAssets, cardBackground } from "@/lib/card-assets";
import { INSTAGRAM_HANDLE } from "@/lib/config";
import { formatMorocco } from "@/lib/morocco-time";
import { tierFor } from "@/lib/points";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Card = {
  match_id: string;
  starts_at: string;
  pitch: string | null;
  home_name: string;
  away_name: string;
  home_score: number | null;
  away_score: number | null;
  team: "home" | "away" | null;
  result: "V" | "N" | "D" | null;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  awards: string[];
  points: number;
  name: string;
  avatar: string | null;
  month_points: number;
};

const RESULT = { V: "VICTOIRE", N: "MATCH NUL", D: "DÉFAITE" } as const;
const AWARD = { gardien: "MEILLEUR GARDIEN", defenseur: "MEILLEUR DÉFENSEUR", milieu: "MEILLEUR MILIEU" } as Record<string, string>;

/**
 * "Ma carte du match": the signed-in player's story card for one match they played
 * (/api/carte/joueur?match=<id>). Private: built from the player's own session.
 */
export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("match") ?? "";
  if (!isSupabaseConfigured || !matchId) return new Response("Not found", { status: 404 });
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.rpc("my_match_card", { p_match_id: matchId });
  const c = ((data ?? []) as Card[])[0];
  if (!c) return new Response("Not found", { status: 404 });

  const { logoSrc, fonts } = await cardAssets();
  const photo = avatarUrl(c.avatar);
  const tier = tierFor(c.month_points);
  const scored = c.home_score !== null && c.away_score !== null;
  const stats: [string, string][] = [
    ["BUTS", String(c.goals)],
    ["PASSES", String(c.assists)],
    ["POINTS", `+${c.points}`],
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "110px 90px", color: CARD.white, fontFamily: "Inter", ...cardBackground }}>
        <div style={{ display: "flex", alignItems: "center", fontFamily: "Anton", fontSize: 64, letterSpacing: 2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={136} height={100} alt="" style={{ marginRight: 24 }} />
          AJI <span style={{ color: CARD.highlight, marginLeft: 18 }}>TL3AB</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} width={340} height={340} alt="" style={{ borderRadius: 999, border: `12px solid ${CARD.highlight}`, objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", width: 340, height: 340, borderRadius: 999, border: `12px solid ${CARD.highlight}`, backgroundColor: CARD.forestLight, alignItems: "center", justifyContent: "center", fontFamily: "Anton", fontSize: 180 }}>
              {(c.name[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 130, lineHeight: 1, marginTop: 48, textTransform: "uppercase", textAlign: "center" }}>{c.name}</div>
          {c.result && (
            <div style={{ display: "flex", marginTop: 32, backgroundColor: c.result === "D" ? CARD.white : CARD.highlight, color: CARD.forest, fontWeight: 700, fontSize: 40, letterSpacing: 6, padding: "14px 34px", borderRadius: 999 }}>
              {RESULT[c.result]}
            </div>
          )}
          {scored && (
            <div style={{ display: "flex", alignItems: "center", marginTop: 40, fontSize: 46, fontWeight: 700 }}>
              <span style={{ color: c.team === "home" ? CARD.highlight : CARD.white, maxWidth: 330, textAlign: "right" }}>{c.home_name}</span>
              <span style={{ fontFamily: "Anton", fontSize: 120, margin: "0 36px" }}>{`${c.home_score} - ${c.away_score}`}</span>
              <span style={{ color: c.team === "away" ? CARD.highlight : CARD.white, maxWidth: 330 }}>{c.away_name}</span>
            </div>
          )}
          <div style={{ display: "flex", marginTop: 56, gap: 28 }}>
            {stats.map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 270, padding: "28px 0", borderRadius: 28, backgroundColor: CARD.forestLight }}>
                <div style={{ display: "flex", fontFamily: "Anton", fontSize: 110, lineHeight: 1, color: label === "POINTS" ? CARD.highlight : CARD.white }}>{value}</div>
                <div style={{ display: "flex", marginTop: 12, fontSize: 30, fontWeight: 700, letterSpacing: 4, color: CARD.muted }}>{label}</div>
              </div>
            ))}
          </div>
          {c.awards.map((a) => (
            <div key={a} style={{ display: "flex", marginTop: 28, fontSize: 40, fontWeight: 700, color: CARD.highlight, letterSpacing: 3 }}>{`ÉLU ${AWARD[a] ?? a.toUpperCase()}`}</div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 38, fontWeight: 500, color: CARD.muted }}>
          <div style={{ display: "flex", color: CARD.white, fontSize: 44, fontWeight: 700 }}>
            {`Ce mois : ${c.month_points} pts${tier ? ` · palier ${tier.label}` : ""}`}
          </div>
          <div style={{ display: "flex", marginTop: 12, textTransform: "capitalize" }}>
            {`${formatMorocco(c.starts_at, { weekday: "long", day: "numeric", month: "long" })}${c.pitch ? ` · ${c.pitch}` : ""}`}
          </div>
          <div style={{ display: "flex", marginTop: 44, color: CARD.highlight, fontWeight: 700 }}>{`ajitl3ab.com · @${INSTAGRAM_HANDLE}`}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts, headers: { "Cache-Control": "private, no-store" } },
  );
}
