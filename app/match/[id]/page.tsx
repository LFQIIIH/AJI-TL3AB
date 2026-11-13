import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JouerTabs from "@/components/JouerTabs";
import MatchMedia from "@/components/MatchMedia";
import ResultCard from "@/components/ResultCard";
import MatchAwards from "@/components/community/MatchAwards";
import type { Award } from "@/lib/community";
import { MATCHES_REVALIDATE_SECONDS, MATCHES_SOURCE } from "@/lib/config";
import { formatDayLong, formatTime, matchStart } from "@/lib/matches";
import { getMatches, MATCHES_TAG } from "@/lib/matches-source";
import { playerPath } from "@/lib/points";
import { fullTitle } from "@/lib/seo";
import { publicRpc } from "@/lib/supabase/publicApi";

// Built on first visit, then refreshed with the match list (and at once after a change in /admin).
export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

type RosterRow = { name: string; code: string | null; team: "home" | "away" | null; goals: number; assists: number };
type MatchEvent = { kind: "goal" | "yellow" | "red"; team: "home" | "away" | null; minute: number | null; player: string | null; assist: string | null };

const cache = { next: { revalidate: MATCHES_REVALIDATE_SECONDS, tags: [MATCHES_TAG] } };

async function safe<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch {
    return fallback;
  }
}

async function getPlayedMatch(rawId: string) {
  const id = decodeURIComponent(rawId);
  const match = (await getMatches()).find((m) => m.id === id);
  if (!match?.result || matchStart(match) > new Date()) return null;
  return match;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const match = await getPlayedMatch((await params).id);
  if (!match?.result) return { title: fullTitle("Match introuvable"), robots: { index: false } };
  const { home, away } = match.result;
  return {
    title: fullTitle(`${home.name} ${home.score}–${away.score} ${away.name}`),
    description: `Résultat du match de foot du ${formatDayLong(match.date)} à ${match.pitch} (${match.area}), Marrakech : buteurs, passeurs, cartons et joueurs élus.`,
    // One page per match: useful to players, too thin for search results.
    robots: { index: false, follow: true },
  };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const match = await getPlayedMatch((await params).id);
  if (!match?.result) notFound();
  const db = MATCHES_SOURCE === "supabase";

  const [events, awards, mediaCount, players] = await Promise.all([
    db ? safe(() => publicRpc<MatchEvent>("public_match_events", { p_match_id: match.id }, cache), []) : [],
    db ? safe(() => publicRpc<Award>("match_awards", { p_match_ids: [match.id] }, cache), []) : [],
    db ? safe(async () => Number(await publicRpc<number>("match_media_count", { p_match_id: match.id }, cache)) || 0, 0) : 0,
    db ? safe(() => publicRpc<RosterRow>("public_match_roster", { p_match_id: match.id }, cache), []) : [],
  ]);
  const { home, away } = match.result;
  const teamName = (t: MatchEvent["team"]) => (t === "home" ? home.name : t === "away" ? away.name : "");

  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <p className="eyebrow capitalize">
        {formatDayLong(match.date)} · {formatTime(match.time)}
      </p>
      <h1 className="headline mt-3 text-5xl sm:text-7xl">
        {home.name} <span className="text-primary">{home.score}–{away.score}</span> {away.name}
      </h1>
      <JouerTabs current="/jouer/historique" className="mt-6" />

      <div className="mt-8">
        <ResultCard match={match} />
        <MatchAwards awards={awards} />
      </div>

      <section aria-labelledby="faits" className="mt-10">
        <h2 id="faits" className="headline text-3xl">
          Faits du match
        </h2>
        {events.length ? (
          <ol className="mt-4 space-y-2">
            {events.map((e, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 rounded-xl bg-canvas-deep px-4 py-2 text-sm ${e.team === "away" ? "flex-row-reverse text-right" : ""}`}
              >
                <span aria-hidden="true">{e.kind === "goal" ? "⚽" : e.kind === "yellow" ? "🟨" : "🟥"}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{e.player ?? "Joueur invité"}</span>
                  {e.assist && <span className="text-ink-muted"> · passe de {e.assist}</span>}
                  <span className="block text-xs text-ink-muted">
                    {e.kind === "goal" ? "But" : e.kind === "yellow" ? "Carton jaune" : "Carton rouge"}
                    {e.team ? ` · ${teamName(e.team)}` : ""}
                    {e.minute != null ? ` · ${e.minute}'` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-ink-muted">Les buteurs et passeurs n&apos;ont pas été saisis pour ce match.</p>
        )}
      </section>

      {players.length > 0 && (
        <section aria-labelledby="presents" className="mt-10">
          <h2 id="presents" className="headline text-3xl">
            Ils ont joué ({players.length})
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {players.map((p, i) => {
              const label = (
                <>
                  {p.name}
                  {p.team && <span className="ml-1 text-xs font-normal text-ink-muted">· {teamName(p.team)}</span>}
                </>
              );
              return (
                <li key={`${p.name}-${i}`}>
                  {p.code ? (
                    <Link href={playerPath(p.code)} className="inline-flex min-h-11 items-center rounded-full bg-canvas-deep px-4 text-sm font-semibold hover:bg-highlight">
                      {label}
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 items-center rounded-full bg-canvas-deep px-4 text-sm font-semibold">{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {db && (
        <section aria-labelledby="photos" className="mt-10">
          <h2 id="photos" className="headline text-3xl">
            Photos et vidéos
          </h2>
          <div className="mt-4">
            <MatchMedia matchId={match.id} count={mediaCount} />
          </div>
        </section>
      )}

      <p className="mt-12 flex flex-wrap gap-4">
        <Link href="/jouer/historique" className="btn-ghost">
          ← Tous les résultats
        </Link>
        <Link href="/jouer" className="btn-primary">
          Réserver le prochain match
        </Link>
      </p>
    </div>
  );
}
