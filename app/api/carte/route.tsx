import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { AWARD_LABELS, awardValueLabel, type Award, type AwardCategory } from "@/lib/community";
import { INSTAGRAM_HANDLE } from "@/lib/config";
import { formatDayLong, formatTime } from "@/lib/matches";
import { getMatches } from "@/lib/matches-source";
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export const runtime = "nodejs";

const C = { forest: "#12372A", forestLight: "#1D4A3A", highlight: "#C7F36B", white: "#FFFFFF", muted: "#9DB5A8" };

const fontFile = (name: string) => readFile(join(process.cwd(), "assets/fonts", name));

/**
 * Instagram-story card (1080×1920) for one award of one match:
 * /api/carte?match=<match id>&cat=buteur|gardien|defenseur|milieu
 */
export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("match") ?? "";
  const category = request.nextUrl.searchParams.get("cat") as AwardCategory;
  if (!isSupabaseConfigured || !matchId || !(category in AWARD_LABELS)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data } = await supabase.rpc("match_awards", { p_match_ids: [matchId] });
  const award = ((data ?? []) as Award[]).find((a) => a.category === category);
  if (!award) return new Response("Not found", { status: 404 });

  const match = (await getMatches().catch(() => [])).find((m) => m.id === matchId);
  const [anton, inter500, inter700, logo] = await Promise.all([
    fontFile("Anton-Regular.ttf"),
    fontFile("Inter-500.ttf"),
    fontFile("Inter-700.ttf"),
    readFile(join(process.cwd(), "assets/logo-mark.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const names = award.name.split(" & ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: C.forest,
          backgroundImage: `linear-gradient(to right, ${C.forestLight} 2px, transparent 2px), linear-gradient(to bottom, ${C.forestLight} 2px, transparent 2px)`,
          backgroundSize: "120px 120px",
          padding: "120px 96px",
          color: C.white,
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontFamily: "Anton", fontSize: 72, letterSpacing: 2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={163} height={120} alt="" style={{ marginRight: 28 }} />
          AJI <span style={{ color: C.highlight, marginLeft: 20 }}>TL3AB</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              backgroundColor: C.highlight,
              color: C.forest,
              fontWeight: 700,
              fontSize: 40,
              letterSpacing: 6,
              padding: "16px 32px",
              borderRadius: 999,
            }}
          >
            JOUEUR DU MATCH
          </div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 120, marginTop: 56, color: C.highlight, textTransform: "uppercase", lineHeight: 1 }}>
            {AWARD_LABELS[category]}
          </div>
          {names.map((n) => (
            <div key={n} style={{ display: "flex", fontFamily: "Anton", fontSize: names.length > 1 ? 150 : 210, lineHeight: 1, marginTop: 24, textTransform: "uppercase" }}>
              {n}
            </div>
          ))}
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, marginTop: 48 }}>{awardValueLabel(award)}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 40, fontWeight: 500, color: C.muted }}>
          {match && (
            <div style={{ display: "flex", color: C.white, fontSize: 46, fontWeight: 700 }}>
              {`${match.format} · ${match.pitch}${match.area ? `, ${match.area}` : ""}`}
            </div>
          )}
          {match && <div style={{ display: "flex", marginTop: 12, textTransform: "capitalize" }}>{`${formatDayLong(match.date)} · ${formatTime(match.time)}`}</div>}
          <div style={{ display: "flex", marginTop: 56, color: C.highlight, fontWeight: 700 }}>{`Marrakech · @${INSTAGRAM_HANDLE}`}</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: "Anton", data: anton, weight: 400, style: "normal" },
        { name: "Inter", data: inter500, weight: 500, style: "normal" },
        { name: "Inter", data: inter700, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    },
  );
}
