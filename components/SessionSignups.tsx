"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { whatsappLink } from "@/lib/config";
import { formatDayLong, formatTime } from "@/lib/matches";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { publicRpc } from "@/lib/supabase/publicApi";
import { useSessionUser } from "@/lib/supabase/useSession";
import { sessionPlace, SESSIONS_SHOWN, type TrainingSession } from "@/lib/training";

type Counts = Record<string, number>;

/**
 * What a list of sessions signs up for.
 * - "minimum" (Training): the session runs once `goal` people signed up.
 * - "capacity" (Switch Off): `goal` places, then the session is full.
 */
export type SessionProgram = {
  table: "training_signups" | "switchoff_signups";
  countsRpc: "training_session_counts" | "switchoff_session_counts";
  mode: "minimum" | "capacity";
  goal: number;
  /** For the WhatsApp fallback: "au training physique", "à Switch Off". */
  whatsappLabel: string;
};

async function supabase() {
  const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
  return getSupabaseBrowserClient();
}

/** Upcoming sessions with live counters and "Je viens" (Training, Switch Off). */
export default function SessionSignups({ sessions: all, program }: { sessions: TrainingSession[]; program: SessionProgram }) {
  const user = useSessionUser();
  // Filtered after mount so a cached page never lists sessions that already started.
  const [sessions, setSessions] = useState<TrainingSession[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [countsFailed, setCountsFailed] = useState(false);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const now = Date.now();
    setSessions(all.filter((x) => new Date(x.start).getTime() > now).slice(0, SESSIONS_SHOWN));
  }, [all]);
  const ids = sessions?.map((x) => x.id) ?? null;
  const idsKey = ids?.join("|") ?? "";

  const loadCounts = useCallback(async (sessionIds: string[]) => {
    try {
      const rows = await publicRpc<{ session_id: string; signups: number }>(program.countsRpc, { p_session_ids: sessionIds });
      const next: Counts = {};
      for (const row of rows) next[row.session_id] = row.signups;
      setCounts(next);
      setCountsFailed(false);
    } catch {
      setCountsFailed(true);
    }
  }, [program.countsRpc]);

  useEffect(() => {
    if (!isSupabaseConfigured || !idsKey) return;
    loadCounts(idsKey.split("|"));
  }, [idsKey, loadCounts]);

  useEffect(() => {
    if (!user || !idsKey) {
      setMine(new Set());
      setHasProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const client = await supabase();
      const [signups, profile] = await Promise.all([
        client.from(program.table).select("session_id").in("session_id", idsKey.split("|")),
        client.from("profiles").select("id").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setMine(new Set((signups.data ?? []).map((r: { session_id: string }) => r.session_id)));
      setHasProfile(Boolean(profile.data));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, idsKey, program.table]);

  async function toggle(session: TrainingSession) {
    if (!user || busy) return;
    const id = session.id;
    setBusy(id);
    setError("");
    const client = await supabase();
    const joined = mine.has(id);
    const { error } = joined
      ? await client.from(program.table).delete().eq("session_id", id).eq("user_id", user.id)
      : await client.from(program.table).insert({ session_start: session.start });
    if (error) {
      setError(
        error.message.includes("session_full")
          ? "Plus de place pour cette séance, désolé ! Choisis-en une autre."
          : "Ça n'a pas marché. Réessaie dans un instant.",
      );
    } else {
      setMine((prev) => {
        const next = new Set(prev);
        if (joined) next.delete(id);
        else next.add(id);
        return next;
      });
      setCounts((prev) => (prev ? { ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (joined ? -1 : 1)) } : prev));
    }
    setBusy(null);
    if (ids) loadCounts(ids);
  }

  if (!sessions) {
    return <div className="card h-48 animate-pulse" aria-busy="true" />;
  }
  if (sessions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="headline text-3xl">Prochaines séances bientôt</p>
        <p className="mt-2 text-ink-muted">Les dates arrivent très vite. Suis-nous sur WhatsApp ou Instagram pour être prévenu.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => {
          const { id, date, time } = session;
          const count = counts?.[id] ?? 0;
          const showCount = isSupabaseConfigured && counts !== null && !countsFailed;
          const goal = program.goal;
          const capacity = program.mode === "capacity";
          const reached = showCount && count >= goal;
          // minimum: reaching the goal confirms the session; capacity: it's full
          const confirmed = !capacity && reached;
          const full = capacity && reached;
          const missing = Math.max(0, goal - count);
          const joined = mine.has(id);
          const pct = Math.min(100, Math.round((count / goal) * 100));

          return (
            <article key={id} className={`card flex flex-col p-5 ${confirmed ? "border-2 border-primary" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold capitalize text-ink-muted">
                    <Icon name="calendar" className="h-4 w-4" />
                    {formatDayLong(date)}
                  </p>
                  <p className="headline mt-1 text-5xl">{formatTime(time)}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm">
                    <Icon name="pin" className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-semibold">{sessionPlace(session)}</span>
                  </p>
                  {session.note && <p className="mt-1 text-sm text-ink-muted">{session.note}</p>}
                </div>
                {(confirmed || full) && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      full ? "bg-ink text-white" : "bg-highlight text-highlight-ink"
                    }`}
                  >
                    {full ? "Complet" : "Confirmée"}
                  </span>
                )}
              </div>

              {showCount ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {capacity ? (
                        full ? (
                          <span className="font-semibold text-ink-muted">Séance complète</span>
                        ) : (
                          <>
                            <span className="font-bold text-primary">{missing}</span> {missing > 1 ? "places restantes" : "place restante"}
                          </>
                        )
                      ) : confirmed ? (
                        <span className="font-semibold text-primary">La séance a lieu ✓</span>
                      ) : (
                        <>
                          Encore <span className="font-bold text-primary">{missing}</span> pour lancer la séance
                        </>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-ink-muted">
                      <Icon name="users" className="h-4 w-4" />
                      {count}/{goal}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-line"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={goal}
                    aria-valuenow={Math.min(count, goal)}
                    aria-label="Inscrits"
                  >
                    <div className={`h-full rounded-full transition-all ${full ? "bg-ink-muted" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-ink-muted">
                  {capacity ? `${goal} places par séance.` : `Minimum ${goal} inscrits pour lancer la séance.`}
                </p>
              )}

              <div className="mt-6 border-t border-line pt-4">
                <SessionAction
                  session={session}
                  program={program}
                  full={full}
                  user={user}
                  hasProfile={hasProfile}
                  joined={joined}
                  busy={busy === id}
                  onToggle={() => toggle(session)}
                />
              </div>
            </article>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </>
  );
}

function SessionAction({
  session,
  program,
  full,
  user,
  hasProfile,
  joined,
  busy,
  onToggle,
}: {
  session: TrainingSession;
  program: SessionProgram;
  full: boolean;
  user: ReturnType<typeof useSessionUser>;
  hasProfile: boolean | null;
  joined: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  if (!isSupabaseConfigured) {
    return (
      <a
        href={whatsappLink(
          `Salam ! Je viens ${program.whatsappLabel} du ${formatDayLong(session.date)} à ${formatTime(session.time)} (${sessionPlace(session)}).`,
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary w-full"
      >
        Je viens
      </a>
    );
  }
  if (user === undefined || (user && hasProfile === null)) {
    return <div className="h-11 animate-pulse rounded-full bg-line" />;
  }
  if (full && !joined) {
    return (
      <button type="button" disabled className="btn-ghost w-full">
        Complet
      </button>
    );
  }
  if (!user) {
    return (
      <Link href="/connexion" className="btn-ghost w-full">
        Connecte-toi pour t&apos;inscrire
      </Link>
    );
  }
  if (!hasProfile) {
    return (
      <Link href="/compte" className="btn-ghost w-full">
        Complète ton profil d&apos;abord
      </Link>
    );
  }
  return joined ? (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-primary">✓ Tu es inscrit</span>
      <button type="button" onClick={onToggle} disabled={busy} className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
        {busy ? "…" : "Annuler"}
      </button>
    </div>
  ) : (
    <button type="button" onClick={onToggle} disabled={busy} className="btn-primary w-full">
      {busy ? "Inscription…" : "Je viens"}
    </button>
  );
}
