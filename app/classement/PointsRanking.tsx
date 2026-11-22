"use client";

import Avatar from "@/components/Avatar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Crown, Flame, Info } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import TierCrest from "@/components/TierCrest";
import { useRpc } from "@/components/community/useRpc";
import { currentMonthRange, monthLabel } from "@/lib/community";
import { LEVEL_TABLE, playerPath, POINTS, tierFor, TIERS } from "@/lib/points";
import { positionLabel, type Position } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { publicRpc } from "@/lib/supabase/publicApi";

export type RankingRow = {
  rank: number;
  rank_change: number | null;
  name: string;
  code: string | null;
  player_position: Position | null;
  points: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goal_diff: number;
  goals: number;
  assists: number;
  awards: number;
  week_streak: number;
  form: string;
  avatar: string | null;
};
type Found = {
  code: string;
  name: string;
  player_position: Position | null;
  matches: number;
  avatar: string | null;
};
type View = "general" | "attaque";

const perMatch = (n: number, m: number) =>
  m ? (n / m).toFixed(1).replace(".", ",") : "0";
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** This month's ranking (général / attaque), last month's MVP, player search and the guide. */
export default function PointsRanking({
  initial,
  initialMvp,
}: {
  initial?: RankingRow[];
  initialMvp?: RankingRow | null;
}) {
  const month = currentMonthRange().month;
  const rows = useRpc<RankingRow>(
    "ranking_table",
    { p_month: month, p_limit: 50 },
    true,
    initial,
  );
  const [view, setView] = useState<View>("general");
  const [guide, setGuide] = useState(false);

  if (!isSupabaseConfigured) return null;

  const sorted =
    view === "general"
      ? (rows ?? [])
      : [...(rows ?? [])].sort(
          (a, b) =>
            b.goals + b.assists - (a.goals + a.assists) ||
            b.goals - a.goals ||
            a.matches - b.matches,
        );

  return (
    <section aria-labelledby="points">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="points" className="headline text-4xl">
            Classement · {monthLabel(month)}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Remis à zéro le 1er de chaque mois. Tous les mois comptent pour ton
            niveau.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setGuide(true)}
          className="btn bg-highlight px-4 py-2 text-highlight-ink hover:brightness-95"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
          Guide
        </button>
      </div>

      {initialMvp && <MvpCard row={initialMvp} />}

      <div
        className="mt-6 flex gap-2"
        role="tablist"
        aria-label="Vue du classement"
      >
        {(
          [
            ["general", "Général"],
            ["attaque", "Attaque"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`chip min-h-11 px-5 ${view === v ? "chip-on" : "chip-off"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {rows === undefined ? (
        <p className="mt-4 text-ink-muted">Chargement…</p>
      ) : rows === null ? (
        <p className="mt-4 text-ink-muted">
          Classement indisponible pour l&apos;instant.
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="Classement vide"
          text="Personne n'a encore joué ce mois-ci. Le premier match te met en tête !"
        >
          <Link href="/jouer" className="btn-primary">
            Voir les matchs
          </Link>
        </EmptyState>
      ) : (
        <>
          <p className="mt-3 text-xs text-ink-muted sm:hidden">
            Fais glisser le tableau vers la gauche pour voir toutes les colonnes
            →
          </p>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-line bg-surface sm:mt-4">
            <table className="w-full min-w-[40rem] border-collapse text-sm tabular-nums">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-surface px-3 py-3"
                  >
                    # Joueur
                  </th>
                  {view === "general" ? (
                    <>
                      <Th>Points</Th>
                      <Th title="Points par match">Moy.</Th>
                      <Th>Matchs</Th>
                      <Th title="Victoires - nuls - défaites">V-N-D</Th>
                      <Th title="Buts marqués moins buts encaissés par ses équipes">
                        +/-
                      </Th>
                      <Th title="Semaines d'affilée avec un match">Série</Th>
                      <Th left>Forme</Th>
                    </>
                  ) : (
                    <>
                      <Th>Buts</Th>
                      <Th>Passes</Th>
                      <Th title="Buts + passes décisives">B+P</Th>
                      <Th title="Buts par match">Buts/m</Th>
                      <Th>Matchs</Th>
                      <Th title="Élu meilleur gardien, défenseur ou milieu">
                        Élu
                      </Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const pos = view === "general" ? r.rank : i + 1;
                  const tier = tierFor(r.points);
                  return (
                    <tr
                      key={`${r.name}-${r.rank}-${i}`}
                      className="border-b border-line last:border-0"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-normal"
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`headline w-6 text-xl ${pos <= 3 ? "text-primary" : "text-ink-muted"}`}
                          >
                            {pos}
                          </span>
                          {view === "general" && (
                            <Move change={r.rank_change} />
                          )}
                          <span className="relative shrink-0">
                            <Avatar name={r.name} path={r.avatar} size={34} />
                            {tier && (
                              <TierCrest
                                tier={tier}
                                className="absolute -bottom-1 -right-1.5 h-4 w-3.5"
                              />
                            )}
                          </span>
                          <span className="min-w-0">
                            {r.code ? (
                              <Link
                                href={playerPath(r.code)}
                                className="block max-w-[9rem] truncate font-semibold hover:text-primary hover:underline sm:max-w-none"
                              >
                                {r.name}
                              </Link>
                            ) : (
                              <span className="block max-w-[9rem] truncate font-semibold sm:max-w-none">
                                {r.name}
                              </span>
                            )}
                            {r.player_position && (
                              <span className="block text-xs text-ink-muted">
                                {positionLabel(r.player_position)}
                              </span>
                            )}
                          </span>
                        </span>
                      </th>
                      {view === "general" ? (
                        <>
                          <Td strong>{r.points}</Td>
                          <Td>{perMatch(r.points, r.matches)}</Td>
                          <Td>{r.matches}</Td>
                          <Td>
                            {r.wins}-{r.draws}-{r.losses}
                          </Td>
                          <Td
                            className={
                              r.goal_diff > 0
                                ? "text-primary"
                                : r.goal_diff < 0
                                  ? "text-red-700"
                                  : ""
                            }
                          >
                            {signed(r.goal_diff)}
                          </Td>
                          <Td>
                            {r.week_streak > 1 ? (
                              <span className="inline-flex items-center gap-1">
                                <Flame
                                  className="h-4 w-4 text-[#B8733A]"
                                  aria-hidden="true"
                                />
                                {r.week_streak}
                              </span>
                            ) : (
                              r.week_streak
                            )}
                          </Td>
                          <td className="px-3 py-2.5">
                            <Form form={r.form} />
                          </td>
                        </>
                      ) : (
                        <>
                          <Td strong>{r.goals}</Td>
                          <Td>{r.assists}</Td>
                          <Td>{r.goals + r.assists}</Td>
                          <Td>{perMatch(r.goals, r.matches)}</Td>
                          <Td>{r.matches}</Td>
                          <Td>{r.awards}</Td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PlayerSearch />

      <Modal
        open={guide}
        onClose={() => setGuide(false)}
        title="Guide du classement"
      >
        <Guide />
      </Modal>
    </section>
  );
}

function Th({
  children,
  title,
  left,
}: {
  children: React.ReactNode;
  title?: string;
  left?: boolean;
}) {
  return (
    <th
      scope="col"
      title={title}
      className={`whitespace-nowrap px-3 py-3 ${left ? "text-left" : "text-right"}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  strong,
  className = "",
}: {
  children: React.ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2.5 text-right ${strong ? "headline text-xl" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

/** Places gained or lost in 7 days. */
function Move({ change }: { change: number | null }) {
  if (!change)
    return (
      <span
        className="w-6 text-center text-xs text-ink-muted"
        aria-label="Même place"
      >
        –
      </span>
    );
  const up = change > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`flex w-6 items-center text-xs font-bold ${up ? "text-primary" : "text-red-700"}`}
      aria-label={`${up ? "Gagne" : "Perd"} ${Math.abs(change)} place${Math.abs(change) > 1 ? "s" : ""}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {Math.abs(change)}
    </span>
  );
}

const FORM_STYLE: Record<string, { cls: string; label: string }> = {
  V: { cls: "bg-primary text-primary-ink", label: "Victoire" },
  N: { cls: "bg-line-strong text-ink", label: "Nul" },
  D: { cls: "bg-red-600 text-white", label: "Défaite" },
};

/** Last results, oldest to newest: V / N / D. */
function Form({ form }: { form: string }) {
  if (!form) return <span className="text-xs text-ink-muted">—</span>;
  return (
    <span
      className="flex gap-1"
      aria-label={`Forme : ${[...form].map((c) => FORM_STYLE[c]?.label).join(", ")}`}
    >
      {[...form].map((c, i) => (
        <span
          key={i}
          className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold ${FORM_STYLE[c]?.cls ?? ""}`}
          aria-hidden="true"
        >
          {c}
        </span>
      ))}
    </span>
  );
}

/** Last month's number 1. */
function MvpCard({ row }: { row: RankingRow }) {
  const stats: [string, number | string][] = [
    ["Points", row.points],
    ["Matchs", row.matches],
    ["Buts", row.goals],
    ["Passes", row.assists],
    ["Victoires", row.wins],
    ["Élu", row.awards],
  ];
  const name = row.code ? (
    <Link href={playerPath(row.code)} className="hover:underline">
      {row.name}
    </Link>
  ) : (
    row.name
  );
  return (
    <div className="mt-6 grid gap-4 rounded-2xl bg-forest p-5 text-white sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="flex items-center gap-3">
        <Avatar
          name={row.name}
          path={row.avatar}
          size={56}
          className="ring-2 ring-highlight"
        />
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-highlight">
            <Crown className="h-4 w-4" aria-hidden="true" />
            MVP · {monthLabel(previousMonthOf(currentMonthRange().month))}
          </p>
          <p className="headline mt-1 text-3xl">{name}</p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {stats.map(([label, value]) => (
          <div key={label} className="text-center">
            <dd className="headline text-2xl text-highlight">{value}</dd>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-white/70">
              {label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

function previousMonthOf(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1
    ? `${y - 1}-12-01`
    : `${y}-${String(m - 1).padStart(2, "0")}-01`;
}

function Guide() {
  const rows: [string, string][] = [
    ["Points", "Le total du mois, calculé à partir du barème ci-dessous."],
    [
      "Moy.",
      "Points par match joué : idéal pour comparer quelqu'un qui joue peu avec un habitué.",
    ],
    ["V-N-D", "Victoires, nuls et défaites de ses équipes."],
    [
      "+/-",
      "Buts marqués moins buts encaissés par ses équipes, sur tous ses matchs du mois.",
    ],
    ["Série", "Semaines d'affilée avec au moins un match. 🔥 à partir de 2."],
    [
      "Forme",
      "Ses 5 derniers résultats, du plus ancien au plus récent : V victoire, N nul, D défaite.",
    ],
    ["↑ ↓", "Places gagnées ou perdues depuis 7 jours."],
    [
      "Attaque",
      "Classement par buts + passes décisives, avec les buts par match.",
    ],
  ];
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="font-bold">Les colonnes</h3>
        <dl className="mt-2 space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[4.5rem_1fr] gap-3">
              <dt className="font-bold">{k}</dt>
              <dd className="text-ink-muted">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-ink-muted">
          Victoires, défaites, +/- et cartons comptent quand le capitaine range
          les joueurs dans les équipes (Direct ou tirage au sort).
        </p>
      </section>
      <section>
        <h3 className="font-bold">Le barème</h3>
        <ul className="mt-2">
          {POINTS.map((p) => (
            <li
              key={p.key}
              className="flex justify-between gap-3 border-b border-line py-1.5"
            >
              <span>{p.label}</span>
              <span
                className={`font-bold tabular-nums ${p.value < 0 ? "text-red-700" : "text-primary"}`}
              >
                {p.value > 0 ? "+" : ""}
                {p.value}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-bold">Paliers du mois</h3>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {[...TIERS].reverse().map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <TierCrest tier={t} className="h-6 w-5" /> {t.label} : {t.min} pts
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-bold">Niveaux (points de tous les mois)</h3>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          {LEVEL_TABLE.map((l) => (
            <li key={l.level} className="flex justify-between gap-2">
              <span>
                Niv. {l.level} · {l.name}
              </span>
              <span className="tabular-nums text-ink-muted">{l.min} pts</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PlayerSearch() {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[] | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return setFound(null);
    let cancelled = false;
    const t = setTimeout(() => {
      publicRpc<Found>("search_players", { p_query: query })
        .then((r) => !cancelled && setFound(r))
        .catch(() => !cancelled && setFound([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="mt-6">
      <label
        htmlFor="cherche-joueur"
        className="mb-2 block text-sm font-semibold"
      >
        Chercher un joueur
      </label>
      <input
        id="cherche-joueur"
        type="search"
        className="input"
        placeholder="Prénom, ex : Yassine"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />
      {found && (
        <ul className="mt-2 space-y-1" aria-live="polite">
          {found.length ? (
            found.map((f) => (
              <li key={f.code}>
                <Link
                  href={playerPath(f.code)}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 hover:bg-canvas-deep"
                >
                  <span className="flex items-center gap-2.5 font-semibold">
                    <Avatar name={f.name} path={f.avatar} size={30} />
                    {f.name}
                  </span>
                  <span className="text-sm text-ink-muted">
                    {f.matches} match{f.matches > 1 ? "s" : ""}
                    {f.player_position
                      ? ` · ${positionLabel(f.player_position)}`
                      : ""}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-ink-muted">
              Aucun joueur trouvé.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
