"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { whatsappLink } from "@/lib/config";
import { formatDayLong, formatTime } from "@/lib/matches";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSessionUser } from "@/lib/supabase/useSession";
import { MIN_PARTICIPANTS, TRAINING_TIME, upcomingSessionDates } from "@/lib/training";

type Counts = Record<string, number>;

async function supabase() {
  const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
  return getSupabaseBrowserClient();
}

export default function TrainingSessions() {
  const user = useSessionUser();
  // Computed after mount so a cached page never lists sessions that already happened.
  const [dates, setDates] = useState<string[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [countsFailed, setCountsFailed] = useState(false);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => setDates(upcomingSessionDates()), []);

  const loadCounts = useCallback(async (ds: string[]) => {
    try {
      const { data, error } = await (await supabase()).rpc("training_counts", {
        from_date: ds[0],
        to_date: ds[ds.length - 1],
      });
      if (error) throw error;
      const next: Counts = {};
      for (const row of (data ?? []) as { session_date: string; signups: number }[]) next[row.session_date] = row.signups;
      setCounts(next);
      setCountsFailed(false);
    } catch {
      setCountsFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !dates?.length) return;
    loadCounts(dates);
  }, [dates, loadCounts]);

  useEffect(() => {
    if (!user || !dates?.length) {
      setMine(new Set());
      setHasProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const client = await supabase();
      const [signups, profile] = await Promise.all([
        client.from("training_signups").select("session_date").in("session_date", dates),
        client.from("profiles").select("id").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setMine(new Set((signups.data ?? []).map((r: { session_date: string }) => r.session_date)));
      setHasProfile(Boolean(profile.data));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, dates]);

  async function toggle(date: string) {
    if (!user || busy) return;
    setBusy(date);
    setError("");
    const client = await supabase();
    const joined = mine.has(date);
    const { error } = joined
      ? await client.from("training_signups").delete().eq("session_date", date).eq("user_id", user.id)
      : await client.from("training_signups").insert({ session_date: date });
    if (error) {
      setError("Ça n'a pas marché. Réessaie dans un instant.");
    } else {
      setMine((prev) => {
        const next = new Set(prev);
        if (joined) next.delete(date);
        else next.add(date);
        return next;
      });
      setCounts((prev) => (prev ? { ...prev, [date]: Math.max(0, (prev[date] ?? 0) + (joined ? -1 : 1)) } : prev));
    }
    setBusy(null);
    if (dates) loadCounts(dates);
  }

  if (!dates) {
    return <div className="card h-48 animate-pulse" aria-busy="true" />;
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dates.map((date) => {
          const count = counts?.[date] ?? 0;
          const showCount = isSupabaseConfigured && counts !== null && !countsFailed;
          const confirmed = showCount && count >= MIN_PARTICIPANTS;
          const missing = Math.max(0, MIN_PARTICIPANTS - count);
          const joined = mine.has(date);
          const pct = Math.min(100, Math.round((count / MIN_PARTICIPANTS) * 100));

          return (
            <article key={date} className={`card flex flex-col p-5 ${confirmed ? "border-2 border-primary" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold capitalize text-ink-muted">
                    <Icon name="calendar" className="h-4 w-4" />
                    {formatDayLong(date)}
                  </p>
                  <p className="headline mt-1 text-5xl">{formatTime(TRAINING_TIME)}</p>
                </div>
                {confirmed && (
                  <span className="rounded-full bg-highlight px-3 py-1 text-xs font-bold uppercase tracking-wide text-highlight-ink">
                    Confirmée
                  </span>
                )}
              </div>

              {showCount ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {confirmed ? (
                        <span className="font-semibold text-primary">La séance a lieu ✓</span>
                      ) : (
                        <>
                          Encore <span className="font-bold text-primary">{missing}</span> pour lancer la séance
                        </>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-ink-muted">
                      <Icon name="users" className="h-4 w-4" />
                      {count}/{MIN_PARTICIPANTS}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-line"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={MIN_PARTICIPANTS}
                    aria-valuenow={Math.min(count, MIN_PARTICIPANTS)}
                    aria-label="Inscrits"
                  >
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-ink-muted">Minimum {MIN_PARTICIPANTS} inscrits pour lancer la séance.</p>
              )}

              <div className="mt-6 border-t border-line pt-4">
                <SessionAction
                  date={date}
                  user={user}
                  hasProfile={hasProfile}
                  joined={joined}
                  busy={busy === date}
                  onToggle={() => toggle(date)}
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
  date,
  user,
  hasProfile,
  joined,
  busy,
  onToggle,
}: {
  date: string;
  user: ReturnType<typeof useSessionUser>;
  hasProfile: boolean | null;
  joined: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  if (!isSupabaseConfigured) {
    return (
      <a
        href={whatsappLink(`Salam ! Je viens au training physique du ${formatDayLong(date)} à ${formatTime(TRAINING_TIME)}.`)}
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
