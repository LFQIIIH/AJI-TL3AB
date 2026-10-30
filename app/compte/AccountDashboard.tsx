"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Match } from "@/data/matches";
import { WhatsAppIcon } from "@/components/Icons";
import {
  computeBadges,
  currentMonthRange,
  monthLabel,
  VOTE_CATEGORIES,
  VOTE_CLOSES_AFTER_MS,
  VOTE_OPENS_AFTER_MS,
  type MyStats,
  type VoteCategory,
} from "@/lib/community";
import { formatDayLong, formatTime } from "@/lib/matches";
import { positionLabel, type Position } from "@/lib/profile";
import { supabaseClient } from "@/lib/supabase/lazy";
import { useSessionUser } from "@/lib/supabase/useSession";
import { PROFILE_SAVED_EVENT } from "./AccountPanel";

type Booking = {
  match_id: string;
  match_date: string;
  match_start: string;
  guests: number;
  attended: boolean;
  goals: number;
};
type Waiting = { match_id: string; match_date: string; match_start: string; promoted_at: string | null };
type Ballot = {
  booking: Booking;
  players: { user_id: string; name: string; player_position: Position }[];
  done: Set<VoteCategory>;
};

export default function AccountDashboard({ matches }: { matches: Match[] }) {
  const user = useSessionUser();
  const [ready, setReady] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waiting, setWaiting] = useState<Waiting[]>([]);
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const byId = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  const load = useCallback(async () => {
    if (!user) return;
    const client = await supabaseClient();
    const [profile, statsRes, bookingsRes, waitingRes] = await Promise.all([
      client.from("profiles").select("id").eq("id", user.id).maybeSingle(),
      client.rpc("my_stats"),
      client
        .from("bookings")
        .select("match_id, match_date, match_start, guests, attended, goals")
        .order("match_start", { ascending: false })
        .limit(60),
      client.from("waitlist").select("match_id, match_date, match_start, promoted_at").is("promoted_at", null),
    ]);
    setHasProfile(Boolean(profile.data));
    setStats(((statsRes.data ?? []) as MyStats[])[0] ?? null);
    const allBookings = (bookingsRes.data ?? []) as Booking[];
    setBookings(allBookings);
    setWaiting(((waitingRes.data ?? []) as Waiting[]).filter((w) => new Date(w.match_start) > new Date()));

    const now = Date.now();
    const open = allBookings.filter((b) => {
      const t = new Date(b.match_start).getTime();
      return b.attended && now >= t + VOTE_OPENS_AFTER_MS && now <= t + VOTE_CLOSES_AFTER_MS;
    });
    if (open.length) {
      const [players, votes] = await Promise.all([
        Promise.all(open.map((b) => client.rpc("match_players", { p_match_id: b.match_id }))),
        client.from("votes").select("match_id, category").in("match_id", open.map((b) => b.match_id)),
      ]);
      const done = (votes.data ?? []) as { match_id: string; category: VoteCategory }[];
      setBallots(
        open.map((b, i) => ({
          booking: b,
          players: (players[i].data ?? []) as Ballot["players"],
          done: new Set(done.filter((v) => v.match_id === b.match_id).map((v) => v.category)),
        })),
      );
    } else {
      setBallots([]);
    }
    setReady(true);
  }, [user]);

  useEffect(() => {
    load();
    window.addEventListener(PROFILE_SAVED_EVENT, load);
    return () => window.removeEventListener(PROFILE_SAVED_EVENT, load);
  }, [load]);

  if (!user || !ready || !hasProfile || !stats) return null;

  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.match_start) > now).reverse();
  const past = bookings.filter((b) => new Date(b.match_start) <= now && b.attended).slice(0, 5);

  return (
    <div className="space-y-6">
      <StatsRow stats={stats} />
      {ballots.filter((b) => b.done.size < VOTE_CATEGORIES.length && b.players.length > 0).map((b) => (
        <BallotCard key={b.booking.match_id} ballot={b} match={byId.get(b.booking.match_id)} onDone={load} />
      ))}
      <Bookings upcoming={upcoming} waiting={waiting} past={past} byId={byId} onChange={load} />
      <Badges stats={stats} />
      <Referral stats={stats} />
      <DrawCard stats={stats} />
    </div>
  );
}

function Section({ title, eyebrow, children, action }: { title: string; eyebrow: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="headline mt-2 text-3xl sm:text-4xl">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** "Semaines" = consecutive weeks with at least one match. */
function StatsRow({ stats }: { stats: MyStats }) {
  const items = [
    { label: "Matchs", value: stats.matches },
    { label: "Buts", value: stats.goals },
    { label: "Prix", value: stats.awards },
    { label: "Semaines", value: stats.week_streak },
    { label: "Tickets", value: stats.tickets_this_month },
  ];
  return (
    <div className="grid grid-cols-5 gap-px overflow-hidden rounded-2xl bg-forest-light">
      {items.map((i) => (
        <div key={i.label} className="bg-forest px-1 py-4 text-center text-white sm:px-3">
          <p className="headline text-3xl text-highlight sm:text-4xl">{i.value}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 sm:text-xs">{i.label}</p>
        </div>
      ))}
    </div>
  );
}

function matchTitle(m: Match | undefined, b: { match_date: string; match_start: string }) {
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" }).format(new Date(b.match_start));
  return (
    <>
      <span className="capitalize">{formatDayLong(b.match_date)}</span> · {m ? formatTime(m.time) : time.replace(":", "h")}
      {m && (
        <>
          {" "}· {m.format} · {m.pitch}
        </>
      )}
    </>
  );
}

function BallotCard({ ballot, match, onDone }: { ballot: Ballot; match: Match | undefined; onDone: () => void }) {
  const [choice, setChoice] = useState<Partial<Record<VoteCategory, string>>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const todo = VOTE_CATEGORIES.filter((c) => !ballot.done.has(c.value));
  const closes = new Date(new Date(ballot.booking.match_start).getTime() + VOTE_CLOSES_AFTER_MS);

  async function submit() {
    const rows = todo.filter((c) => choice[c.value]).map((c) => ({ match_id: ballot.booking.match_id, category: c.value, candidate_id: choice[c.value] }));
    if (!rows.length) return;
    setPending(true);
    setError("");
    const { error } = await (await supabaseClient()).from("votes").insert(rows);
    setPending(false);
    if (error) setError("Le vote n'a pas pu être enregistré. Réessaie.");
    else onDone();
  }

  return (
    <section className="rounded-2xl border-2 border-primary bg-surface p-5 sm:p-6">
      <p className="eyebrow">À toi de voter · jusqu&apos;au {new Intl.DateTimeFormat("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" }).format(closes)}</p>
      <h2 className="headline mt-2 text-3xl">Qui a brillé ?</h2>
      <p className="mt-1 text-sm text-ink-muted">{matchTitle(match, ballot.booking)}</p>
      <div className="mt-5 space-y-5">
        {todo.map((c) => (
          <fieldset key={c.value}>
            <legend className="mb-2 text-sm font-semibold">{c.label}</legend>
            <div className="flex flex-wrap gap-2">
              {ballot.players.map((p) => (
                <button
                  key={p.user_id}
                  type="button"
                  onClick={() => setChoice((prev) => ({ ...prev, [c.value]: p.user_id }))}
                  aria-pressed={choice[c.value] === p.user_id}
                  className={`chip px-3 py-1.5 ${choice[c.value] === p.user_id ? "chip-on" : "chip-off"}`}
                >
                  {p.name} <span className="text-xs opacity-70">· {positionLabel(p.player_position)}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <button type="button" onClick={submit} disabled={pending || !todo.some((c) => choice[c.value])} className="btn-primary mt-6 w-full sm:w-auto">
        {pending ? "Envoi…" : "Envoyer mes votes"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}

function Bookings({
  upcoming,
  waiting,
  past,
  byId,
  onChange,
}: {
  upcoming: Booking[];
  waiting: Waiting[];
  past: Booking[];
  byId: Map<string, Match>;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function cancel(b: Booking) {
    if (!window.confirm("Annuler cette réservation ?")) return;
    setBusy(b.match_id);
    await fetch(`/api/reservations?matchId=${encodeURIComponent(b.match_id)}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    onChange();
  }

  async function leave(w: Waiting) {
    setBusy(w.match_id);
    const client = await supabaseClient();
    const { data } = await client.auth.getUser();
    if (data.user) await client.from("waitlist").delete().eq("match_id", w.match_id).eq("user_id", data.user.id);
    setBusy(null);
    onChange();
  }

  return (
    <Section eyebrow="Mes matchs" title="Réservations" action={<Link href="/jouer" className="btn-primary px-4 py-2">Réserver</Link>}>
      {upcoming.length === 0 && waiting.length === 0 ? (
        <p className="text-sm text-ink-muted">Aucun match prévu. <Link href="/jouer" className="font-semibold text-primary hover:underline">Choisis ton prochain match →</Link></p>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((b) => (
            <li key={b.match_id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>
                <span className="font-bold text-primary">✓</span> {matchTitle(byId.get(b.match_id), b)}
                {b.guests > 0 && <span className="font-semibold"> · +1 pote</span>}
              </span>
              <button type="button" onClick={() => cancel(b)} disabled={busy === b.match_id} className="shrink-0 font-semibold text-ink-muted hover:text-ink hover:underline">
                {busy === b.match_id ? "…" : "Annuler"}
              </button>
            </li>
          ))}
          {waiting.map((w) => (
            <li key={w.match_id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>
                <span className="rounded-full bg-canvas-deep px-2 py-0.5 text-xs font-bold uppercase">En attente</span> {matchTitle(byId.get(w.match_id), w)}
              </span>
              <button type="button" onClick={() => leave(w)} disabled={busy === w.match_id} className="shrink-0 font-semibold text-ink-muted hover:text-ink hover:underline">
                {busy === w.match_id ? "…" : "Quitter"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-muted">Derniers matchs joués</p>
          <ul className="mt-2 divide-y divide-line">
            {past.map((b) => (
              <li key={b.match_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-ink-muted">{matchTitle(byId.get(b.match_id), b)}</span>
                {b.goals > 0 && <span className="shrink-0 font-semibold">⚽ {b.goals}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

function Badges({ stats }: { stats: MyStats }) {
  const badges = computeBadges(stats);
  const earned = badges.filter((b) => b.earned).length;
  return (
    <Section eyebrow={`${earned}/${badges.length} débloqués`} title="Badges">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((b) => (
          <li
            key={b.id}
            className={`rounded-xl border p-3 text-center ${b.earned ? "border-primary bg-highlight/30" : "border-line bg-canvas opacity-60 grayscale"}`}
          >
            <span className="text-3xl" aria-hidden="true">{b.icon}</span>
            <p className="mt-1 text-sm font-bold">{b.label}</p>
            <p className="text-xs text-ink-muted">{b.earned ? "Débloqué ✓" : b.hint}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Referral({ stats }: { stats: MyStats }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!stats.referral_code) return null;
  const link = `${origin}/r/${stats.referral_code}`;
  const message = `Viens jouer au foot avec moi sur AJI TL3AB ⚽ Inscris-toi avec mon lien : ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <Section eyebrow="Ramène un pote" title="+1 ticket par pote">
      <p className="text-sm text-ink-muted">
        Chaque pote qui s&apos;inscrit avec ton lien et joue dans le mois te donne <strong className="text-ink">un ticket de plus</strong> pour le
        tirage au sort du mois.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-line-strong bg-canvas p-2 pl-4">
        <code className="min-w-0 flex-1 truncate text-sm">{link}</code>
        <button type="button" onClick={copy} className="btn-ghost shrink-0 px-4 py-2">
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="btn-primary px-4 py-2">
          <WhatsAppIcon /> Partager sur WhatsApp
        </a>
        <span className="self-center text-sm text-ink-muted">
          Code : <strong className="font-mono text-ink">{stats.referral_code}</strong>
        </span>
      </div>
      <p className="mt-4 text-sm">
        <strong>{stats.referrals_signed_up}</strong> {stats.referrals_signed_up > 1 ? "potes inscrits" : "pote inscrit"} ·{" "}
        <strong>{stats.referrals_played}</strong> {stats.referrals_played > 1 ? "ont joué" : "a joué"}
      </p>
    </Section>
  );
}

function DrawCard({ stats }: { stats: MyStats }) {
  const { month } = currentMonthRange();
  return (
    <section className="rounded-2xl bg-forest p-5 text-white sm:p-6">
      <p className="eyebrow text-highlight">Tirage au sort · {monthLabel(month)}</p>
      <h2 className="headline mt-2 text-3xl sm:text-4xl">
        {stats.tickets_this_month > 0 ? (
          <>
            Tu as <span className="text-highlight">{stats.tickets_this_month}</span> {stats.tickets_this_month > 1 ? "tickets" : "ticket"}
          </>
        ) : (
          "Pas encore de ticket ce mois"
        )}
      </h2>
      <p className="mt-2 text-sm text-white/70">
        {stats.tickets_this_month > 0
          ? "Le gagnant joue un match gratuit. Plus de potes = plus de chances."
          : "Joue au moins un match ce mois-ci pour participer. Le gagnant joue un match gratuit."}
      </p>
      <Link href="/classement#tirage" className="mt-4 inline-block text-sm font-bold text-highlight hover:underline">
        Règles et anciens gagnants →
      </Link>
    </section>
  );
}
