import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { CARD, cardAssets, cardBackground } from "@/lib/card-assets";
import { INSTAGRAM_HANDLE } from "@/lib/config";
import { formatDayLong, formatTime } from "@/lib/matches";
import { getMatches } from "@/lib/matches-source";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { publicRpc } from "@/lib/supabase/publicApi";

export const runtime = "nodejs";

type MatchEvent = { kind: "goal" | "yellow" | "red"; team: "home" | "away" | null; player: string | null; assist: string | null };

/** Result card of a played match, for Instagram stories (/api/carte/match?match=<id>). Public. */
export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("match") ?? "";
  const match = (await getMatches().catch(() => [])).find((m) => m.id === matchId);
  if (!match?.result) return new Response("Not found", { status: 404 });
  const { home, away, mvp } = match.result;
  const events = isSupabaseConfigured ? await publicRpc<MatchEvent>("public_match_events", { p_match_id: matchId }).catch(() => []) : [];
  const scorers = (team: "home" | "away") => {
    const counts = new Map<string, number>();
    for (const e of events) if (e.kind === "goal" && e.team === team) counts.set(e.player ?? "Invité", (counts.get(e.player ?? "Invité") ?? 0) + 1);
    return [...counts].slice(0, 6).map(([n, k]) => (k > 1 ? `${n} x${k}` : n));
  };
  const homeWon = home.score > away.score;
  const awayWon = away.score > home.score;
  const { logoSrc, fonts } = await cardAssets();

  const side = (name: string, score: number, won: boolean, list: string[], alignEnd: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: alignEnd ? "flex-end" : "flex-start", width: 420 }}>
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: 72, lineHeight: 1.05, textTransform: "uppercase", color: won ? CARD.highlight : CARD.white, textAlign: alignEnd ? "right" : "left" }}>{name}</div>
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: 260, lineHeight: 1, marginTop: 20, color: won ? CARD.highlight : CARD.white }}>{String(score)}</div>
      {list.map((s) => (
        <div key={s} style={{ display: "flex", marginTop: 10, fontSize: 36, fontWeight: 500, color: CARD.muted }}>{s}</div>
      ))}
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "110px 90px", color: CARD.white, fontFamily: "Inter", ...cardBackground }}>
        <div style={{ display: "flex", alignItems: "center", fontFamily: "Anton", fontSize: 64, letterSpacing: 2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={136} height={100} alt="" style={{ marginRight: 24 }} />
          AJI <span style={{ color: CARD.highlight, marginLeft: 18 }}>TL3AB</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", backgroundColor: CARD.highlight, color: CARD.forest, fontWeight: 700, fontSize: 40, letterSpacing: 6, padding: "14px 34px", borderRadius: 999 }}>
            {homeWon || awayWon ? "RÉSULTAT" : "MATCH NUL"}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: 70 }}>
            {side(home.name, home.score, homeWon, scorers("home"), false)}
            {side(away.name, away.score, awayWon, scorers("away"), true)}
          </div>
          {mvp && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 80 }}>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 6, color: CARD.muted }}>HOMME DU MATCH</div>
              <div style={{ display: "flex", fontFamily: "Anton", fontSize: 110, marginTop: 8, textTransform: "uppercase", color: CARD.highlight }}>{mvp}</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 38, fontWeight: 500, color: CARD.muted }}>
          <div style={{ display: "flex", color: CARD.white, fontSize: 44, fontWeight: 700 }}>{`${match.format} · ${match.pitch}${match.area ? `, ${match.area}` : ""}`}</div>
          <div style={{ display: "flex", marginTop: 12, textTransform: "capitalize" }}>{`${formatDayLong(match.date)} · ${formatTime(match.time)}`}</div>
          <div style={{ display: "flex", marginTop: 44, color: CARD.highlight, fontWeight: 700 }}>{`ajitl3ab.com · @${INSTAGRAM_HANDLE}`}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts, headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
  );
}
