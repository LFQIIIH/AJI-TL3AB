import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JouerTabs from "@/components/JouerTabs";
import { LevelBar, TierPill } from "@/components/PlayerLevel";
import { computeBadges, type MyStats } from "@/lib/community";
import { MATCHES_REVALIDATE_SECONDS } from "@/lib/config";
import { formatDay } from "@/lib/matches";
import { levelFor, ordinal } from "@/lib/points";
import { positionLabel, type Position } from "@/lib/profile";
import { fullTitle } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { publicRpc } from "@/lib/supabase/publicApi";

export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

type Recent = {
  match_id: string;
  date: string;
  goals: number;
  assists: number;
  team: "home" | "away" | null;
  home_name: string | null;
  away_name: string | null;
  home_score: number | null;
  away_score: number | null;
};
type Profile = {
  code: string;
  name: string;
  player_position: Position | null;
  member_since: string;
  points_total: number;
  points_month: number;
  rank_month: number | null;
  matches: number;
  wins: number;
  goals: number;
  assists: number;
  awards: number;
  best_match_goals: number;
  week_streak: number;
  yellow: number;
  red: number;
  referrals_played: number;
  recent: Recent[];
};

async function getProfile(code: string): Promise<Profile | null> {
  if (!isSupabaseConfigured || !/^[a-z0-9]{6,12}$/.test(code)) return null;
  try {
    const rows = await publicRpc<Profile>("player_profile", { p_code: code }, { next: { revalidate: MATCHES_REVALIDATE_SECONDS } });
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const p = await getProfile((await params).code);
  if (!p) return { title: fullTitle("Joueur introuvable"), robots: { index: false } };
  const l = levelFor(p.points_total);
  return {
    title: fullTitle(`${p.name} · Niv. ${l.level} ${l.name}`),
    description: `${p.name} sur AJI TL3AB : ${p.matches} matchs, ${p.goals} buts, ${p.assists} passes décisives à Marrakech.`,
    // Player pages are for the community, not for search results.
    robots: { index: false, follow: true },
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ code: string }> }) {
  const p = await getProfile((await params).code);
  if (!p) notFound();

  const stats: MyStats = {
    matches: p.matches,
    goals: p.goals,
    best_match_goals: p.best_match_goals,
    awards: p.awards,
    votes_received: 0,
    referral_code: null,
    referrals_signed_up: 0,
    referrals_played: p.referrals_played,
    week_streak: p.week_streak,
    tickets_this_month: 0,
  };
  const badges = computeBadges(stats).filter((b) => b.earned);
  const tiles: [string, number][] = [
    ["Matchs", p.matches],
    ["Victoires", p.wins],
    ["Buts", p.goals],
    ["Passes", p.assists],
    ["Élu du match", p.awards],
    ["Semaines d'affilée", p.week_streak],
  ];

  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">Joueur AJI TL3AB{p.player_position ? ` · ${positionLabel(p.player_position)}` : ""}</p>
      <h1 className="headline mt-3 text-6xl sm:text-7xl">{p.name}</h1>
      <JouerTabs current="/classement" className="mt-6" />

      <section className="card mt-8 p-5 sm:p-6">
        <LevelBar points={p.points_total} />
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm">
          <span className="font-semibold">Ce mois : {p.points_month} pts</span>
          <TierPill monthPoints={p.points_month} />
          {p.rank_month && <span className="text-ink-muted">{ordinal(p.rank_month)} du classement</span>}
        </div>
      </section>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="card p-4 text-center">
            <dd className="headline text-4xl">{value}</dd>
            <dt className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
          </div>
        ))}
      </dl>

      {badges.length > 0 && (
        <section aria-labelledby="badges" className="mt-10">
          <h2 id="badges" className="headline text-3xl">
            Badges
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {badges.map((b) => (
              <li key={b.id} className="rounded-full bg-canvas-deep px-3 py-1.5 text-sm font-semibold">
                <span aria-hidden="true">{b.icon}</span> {b.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="derniers" className="mt-10">
        <h2 id="derniers" className="headline text-3xl">
          Derniers matchs
        </h2>
        {p.recent.length ? (
          <ul className="mt-4 space-y-2">
            {p.recent.map((r) => {
              const played = r.home_score != null && r.away_score != null;
              const mine = r.team === "home" ? r.home_score : r.away_score;
              const theirs = r.team === "home" ? r.away_score : r.home_score;
              const outcome = !played || !r.team ? null : mine! > theirs! ? "Victoire" : mine === theirs ? "Nul" : "Défaite";
              const row = (
                <>
                  <span className="min-w-0">
                    <span className="block font-semibold capitalize">{formatDay(r.date)}</span>
                    <span className="block text-sm text-ink-muted">
                      {played ? `${r.home_name ?? "Équipe 1"} ${r.home_score}–${r.away_score} ${r.away_name ?? "Équipe 2"}` : "Score non saisi"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    {outcome && <span className="block font-semibold">{outcome}</span>}
                    <span className="text-ink-muted">
                      {r.goals > 0 ? `${r.goals} ⚽` : ""} {r.assists > 0 ? `${r.assists} passe${r.assists > 1 ? "s" : ""}` : ""}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={r.match_id}>
                  {played ? (
                    <Link href={`/match/${encodeURIComponent(r.match_id)}`} className="card flex items-center justify-between gap-3 p-4 transition hover:border-primary">
                      {row}
                    </Link>
                  ) : (
                    <div className="card flex items-center justify-between gap-3 p-4">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-ink-muted">Pas encore de match joué.</p>
        )}
      </section>

      <p className="mt-12 flex flex-wrap gap-4">
        <Link href="/classement" className="btn-ghost">
          ← Classement
        </Link>
        <Link href="/jouer" className="btn-primary">
          Joue avec {p.name.split(" ")[0]}
        </Link>
      </p>
    </div>
  );
}
