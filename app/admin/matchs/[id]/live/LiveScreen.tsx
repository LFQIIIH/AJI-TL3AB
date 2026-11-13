"use client";

import { useEffect, useState, useTransition } from "react";
import Modal from "@/components/Modal";
import { liveAddEvent, liveDeleteEvent, liveReload, liveSetTeam } from "./actions";
import type { LiveEvent, LivePlayer, LiveState } from "./data";

type Team = "home" | "away";
type Picker = { kind: "goal"; team: Team; step: "scorer" | "assist"; scorer?: string | null } | { kind: "yellow" | "red" } | null;

const KIND_ICON: Record<LiveEvent["kind"], string> = { goal: "⚽", yellow: "🟨", red: "🟥" };
const KIND_LABEL: Record<LiveEvent["kind"], string> = { goal: "But", yellow: "Carton jaune", red: "Carton rouge" };

/** Captain's live screen: one-thumb buttons, every change saved at once. */
export default function LiveScreen({ matchId, initial }: { matchId: string; initial: LiveState }) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [minute, setMinute] = useState("");
  const [pending, start] = useTransition();

  // Another captain may be recording too: refresh every 20 s while the screen is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      liveReload(matchId).then((r) => r.state && setState(r.state));
    }, 20000);
    return () => clearInterval(id);
  }, [matchId]);

  function run(action: () => Promise<{ error?: string; state?: LiveState }>, after?: () => void) {
    setError(null);
    start(async () => {
      const r = await action();
      if (r.error) setError(r.error);
      if (r.state) setState(r.state);
      if (!r.error) after?.();
    });
  }

  const present = state.players.filter((p) => p.attended !== false);
  const teamOf = (t: Team | null) => present.filter((p) => p.team === t);
  const minuteValue = /^\d{1,3}$/.test(minute) ? Number(minute) : null;

  function closePicker() {
    setPicker(null);
    setMinute("");
  }

  function addGoal(team: Team, scorer: string | null, assist: string | null) {
    run(() => liveAddEvent({ matchId, kind: "goal", userId: scorer, assistId: assist, team, minute: minuteValue }), closePicker);
  }

  return (
    <div className="mt-4 space-y-6 pb-24">
      {/* Score */}
      <section className="card sticky top-2 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4" aria-live="polite">
        <p className="headline truncate text-xl">{state.homeName}</p>
        <p className="headline text-5xl tabular-nums">
          {state.homeScore ?? 0}
          <span className="mx-2 text-line-strong">–</span>
          {state.awayScore ?? 0}
        </p>
        <p className="headline truncate text-right text-xl">{state.awayName}</p>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      {/* Actions */}
      <section className="grid grid-cols-2 gap-3">
        <button type="button" className="btn-primary min-h-16 text-base" disabled={pending} onClick={() => setPicker({ kind: "goal", team: "home", step: "scorer" })}>
          ⚽ But {state.homeName}
        </button>
        <button type="button" className="btn-primary min-h-16 text-base" disabled={pending} onClick={() => setPicker({ kind: "goal", team: "away", step: "scorer" })}>
          ⚽ But {state.awayName}
        </button>
        <button type="button" className="btn-ghost min-h-14" disabled={pending} onClick={() => setPicker({ kind: "yellow" })}>
          🟨 Carton jaune
        </button>
        <button type="button" className="btn-ghost min-h-14" disabled={pending} onClick={() => setPicker({ kind: "red" })}>
          🟥 Carton rouge
        </button>
      </section>

      {/* Events */}
      <section aria-labelledby="faits">
        <h2 id="faits" className="headline text-2xl">
          Faits du match
        </h2>
        {state.events.length ? (
          <ol className="mt-3 space-y-2">
            {[...state.events].reverse().map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-xl bg-canvas-deep px-4 py-2 text-sm">
                <span aria-hidden="true">{KIND_ICON[e.kind]}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{e.player ?? "Joueur invité"}</span>
                  {e.assist && <span className="text-ink-muted"> · passe {e.assist}</span>}
                  <span className="block text-xs text-ink-muted">
                    {KIND_LABEL[e.kind]}
                    {e.team ? ` · ${e.team === "home" ? state.homeName : state.awayName}` : ""}
                    {e.minute != null ? ` · ${e.minute}'` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => confirm(`Annuler : ${KIND_LABEL[e.kind]} ${e.player ?? "joueur invité"} ?`) && run(() => liveDeleteEvent(matchId, e.id))}
                  className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-red-700 hover:underline"
                >
                  Annuler
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">Aucun but ni carton pour l&apos;instant. Le score se calcule tout seul à partir des buts.</p>
        )}
      </section>

      {/* Teams */}
      <section aria-labelledby="equipes">
        <h2 id="equipes" className="headline text-2xl">
          Équipes
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Range chaque joueur dans son équipe avant le coup d&apos;envoi : un but est alors compté pour la bonne équipe. Les potes (+1) se comptent avec « Joueur invité ».
        </p>
        {state.players.length ? (
          <ul className="mt-3 space-y-2">
            {state.players.map((p) => (
              <li key={p.user_id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 ${p.attended === false ? "opacity-50" : ""}`}>
                <span className="min-w-0 text-sm">
                  <span className="font-semibold">{p.name}</span>
                  {p.guests > 0 && <span className="ml-1 text-ink-muted">+1</span>}
                  {p.attended === false && <span className="ml-1 text-ink-muted">(absent)</span>}
                  {(p.goals > 0 || p.assists > 0) && (
                    <span className="ml-2 text-ink-muted">
                      {p.goals > 0 && `${p.goals} ⚽`} {p.assists > 0 && `${p.assists} passe${p.assists > 1 ? "s" : ""}`}
                    </span>
                  )}
                </span>
                <span className="flex gap-1" role="group" aria-label={`Équipe de ${p.name}`}>
                  {(
                    [
                      ["home", "1"],
                      ["away", "2"],
                      [null, "—"],
                    ] as const
                  ).map(([t, label]) => (
                    <button
                      key={label}
                      type="button"
                      disabled={pending}
                      aria-pressed={p.team === t}
                      onClick={() => p.team !== t && run(() => liveSetTeam(matchId, p.user_id, t))}
                      className={`chip min-h-11 min-w-11 justify-center ${p.team === t ? "chip-on" : "chip-off"}`}
                    >
                      {label}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">Personne n&apos;a réservé en ligne. Utilise « Joueur invité » pour compter les buts.</p>
        )}
      </section>

      <Modal
        open={picker !== null}
        onClose={closePicker}
        title={
          picker?.kind === "goal"
            ? picker.step === "scorer"
              ? `But ${picker.team === "home" ? state.homeName : state.awayName}`
              : "Passe décisive ?"
            : picker?.kind === "yellow"
              ? "Carton jaune"
              : "Carton rouge"
        }
      >
        {picker && (
          <div className="space-y-4">
            {(picker.kind !== "goal" || picker.step === "scorer") && (
              <label className="flex items-center gap-3 text-sm font-semibold">
                Minute (optionnel)
                <input className="input w-24 py-2" inputMode="numeric" pattern="\d{0,3}" value={minute} onChange={(e) => setMinute(e.target.value.replace(/\D/g, "").slice(0, 3))} />
              </label>
            )}

            {picker.kind === "goal" && picker.step === "scorer" && (
              <PlayerList
                players={[...teamOf(picker.team), ...teamOf(null)]}
                split={teamOf(picker.team).length}
                disabled={pending}
                onPick={(id) => {
                  const others = present.filter((p) => p.user_id !== id && (p.team === picker.team || p.team === null));
                  if (others.length) setPicker({ ...picker, step: "assist", scorer: id });
                  else addGoal(picker.team, id, null);
                }}
                extra={{ label: "Joueur invité / hors site", onPick: () => addGoal(picker.team, null, null) }}
              />
            )}

            {picker.kind === "goal" && picker.step === "assist" && (
              <PlayerList
                players={[...teamOf(picker.team), ...teamOf(null)].filter((p) => p.user_id !== picker.scorer)}
                split={teamOf(picker.team).filter((p) => p.user_id !== picker.scorer).length}
                disabled={pending}
                onPick={(id) => addGoal(picker.team, picker.scorer ?? null, id)}
                extra={{ label: "Pas de passe décisive", onPick: () => addGoal(picker.team, picker.scorer ?? null, null) }}
              />
            )}

            {picker.kind !== "goal" && (
              <PlayerList
                players={present}
                split={present.length}
                disabled={pending}
                onPick={(id) => run(() => liveAddEvent({ matchId, kind: picker.kind, userId: id, minute: minuteValue }), closePicker)}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Big tap targets; players after `split` are shown under "Sans équipe". */
function PlayerList({
  players,
  split,
  disabled,
  onPick,
  extra,
}: {
  players: LivePlayer[];
  split: number;
  disabled: boolean;
  onPick: (userId: string) => void;
  extra?: { label: string; onPick: () => void };
}) {
  const button = (p: LivePlayer) => (
    <li key={p.user_id}>
      <button type="button" disabled={disabled} onClick={() => onPick(p.user_id)} className="btn-ghost min-h-12 w-full justify-start">
        {p.name}
      </button>
    </li>
  );
  return (
    <div className="space-y-3">
      <ul className="space-y-2">{players.slice(0, split).map(button)}</ul>
      {players.length > split && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Sans équipe</p>
          <ul className="space-y-2">{players.slice(split).map(button)}</ul>
        </>
      )}
      {!players.length && !extra && <p className="text-sm text-ink-muted">Aucun joueur présent.</p>}
      {extra && (
        <button type="button" disabled={disabled} onClick={extra.onPick} className="btn-primary min-h-12 w-full">
          {extra.label}
        </button>
      )}
    </div>
  );
}
