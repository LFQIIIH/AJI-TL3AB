import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, formatAdminDate, requireStaff, type AdminMatch, type Pitch } from "@/lib/admin";
import MatchMedia from "@/components/MatchMedia";
import AdminNav from "../../AdminNav";
import MatchForm from "../../MatchForm";
import { deleteMatch, duplicateMatch, setMatchStatus, setResult, updateBooking, updateMatch } from "../../actions";

type RosterRow = {
  user_id: string;
  player_name: string | null;
  phone: string | null;
  player_position: string | null;
  status: "booked" | "waiting";
  guests: number;
  shoe_size: number | null;
  guest_shoe_size: number | null;
  attended: boolean | null;
  goals: number | null;
  paid_mad: number | null;
  team: "home" | "away" | null;
  assists: number | null;
};

type Feedback = {
  answers: number;
  organisation: number | null;
  refereeing: number | null;
  intensity: number | null;
  level_vote: number | null;
  comments: string[] | null;
};

const POSITION: Record<string, string> = { gardien: "Gardien", defenseur: "Défenseur", milieu: "Milieu", attaquant: "Attaquant" };

export default async function AdminMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { supabase, role } = await requireStaff();
  const { id } = await params;
  const { ok, erreur } = await searchParams;
  const matchId = decodeURIComponent(id);

  const { data } = await supabase.from("matches").select("*, pitches(name, area)").eq("id", matchId).maybeSingle();
  if (!data) notFound();
  const match = data as AdminMatch;
  const isAdmin = role === "admin";

  const [{ data: roster }, { data: pitches }, { data: staff }, { data: feedbackRows }] = await Promise.all([
    supabase.rpc("staff_match_roster", { p_match_id: matchId }),
    isAdmin ? supabase.from("pitches").select("*").order("name") : Promise.resolve({ data: [] }),
    isAdmin ? supabase.rpc("admin_list_staff") : Promise.resolve({ data: [] }),
    supabase.rpc("staff_match_feedback", { p_match_id: matchId }),
  ]);
  const feedback = ((feedbackRows ?? []) as Feedback[])[0];
  const players = (roster ?? []) as RosterRow[];
  const booked = players.filter((p) => p.status === "booked");
  const waiting = players.filter((p) => p.status === "waiting");
  const online = booked.reduce((n, p) => n + 1 + p.guests, 0);
  const started = new Date(match.starts_at).getTime() <= Date.now();
  const category = CATEGORIES.find((c) => c.value === match.category)?.label;
  const startMs = new Date(match.starts_at).getTime();
  const liveOpen = match.status === "published" && Date.now() >= startMs - 30 * 60000 && Date.now() <= startMs + 3 * 86400000;
  const publicPage = `/match/${encodeURIComponent(match.id)}`;

  return (
    <>
      <AdminNav role={role} current="/admin" title={formatAdminDate(match.starts_at)} ok={ok} erreur={erreur} />
      <p className="-mt-4 mb-8 text-ink-muted">
        <Link href="/admin" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
          ← Tous les matchs
        </Link>
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        {liveOpen && (
          <Link href={`/admin/matchs/${encodeURIComponent(match.id)}/live`} className="btn-primary">
            ⚽ Direct : équipes, buts, cartons
          </Link>
        )}
        {started && match.status === "published" && (
          <Link href={publicPage} className="btn-ghost">
            Page publique du match
          </Link>
        )}
      </div>

      {/* Summary */}
      <section className="card grid gap-4 p-6 sm:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Terrain</p>
          <p className="mt-1 font-semibold">{match.pitches?.name}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Match</p>
          <p className="mt-1 font-semibold">
            {match.format} · {match.level} · {category}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Places</p>
          <p className="mt-1 font-semibold">
            {online + match.extra_spots}/{match.total_spots}{" "}
            <span className="text-sm font-normal text-ink-muted">
              ({online} en ligne + {match.extra_spots} hors site)
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Prix</p>
          <p className="mt-1 font-semibold">{match.price_mad} MAD</p>
        </div>
      </section>

      {/* Roster */}
      <section aria-labelledby="joueurs" className="mt-10">
        <h2 id="joueurs" className="headline text-3xl">
          Joueurs inscrits en ligne ({booked.length})
        </h2>
        {!started && booked.length > 0 && <p className="mt-1 text-sm text-ink-muted">Présence et buts se saisissent après le coup d&apos;envoi.</p>}
        {booked.length ? (
          <ul className="mt-4 space-y-3">
            {booked.map((p) => (
              <li key={p.user_id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {p.player_name ?? "Joueur"}
                      {p.guests > 0 && <span className="ml-2 rounded-full bg-canvas-deep px-2 py-0.5 text-xs">+1 pote</span>}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {p.player_position ? POSITION[p.player_position] : ""}
                      {p.shoe_size ? ` · chaussures ${p.shoe_size}` : ""}
                      {p.guest_shoe_size ? ` · pote ${p.guest_shoe_size}` : ""}
                      {p.paid_mad !== null ? ` · payé ${p.paid_mad} MAD` : " · paie sur place"}
                      {p.team ? ` · ${p.team === "home" ? "Équipe 1" : "Équipe 2"}` : ""}
                      {p.assists ? ` · ${p.assists} passe${p.assists > 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                  {p.phone && (
                    <a
                      href={`https://wa.me/${p.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
                    >
                      {p.phone}
                    </a>
                  )}
                </div>
                {started && (
                  <form action={updateBooking} className="mt-3 flex flex-wrap items-center gap-4 border-t border-line pt-3">
                    <input type="hidden" name="match_id" value={match.id} />
                    <input type="hidden" name="user_id" value={p.user_id} />
                    <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" name="attended" defaultChecked={p.attended ?? true} className="h-5 w-5 accent-primary" />
                      Présent
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold">
                      Buts
                      <input type="number" name="goals" min={0} max={50} defaultValue={p.goals ?? 0} className="input w-20 py-2" />
                    </label>
                    <button type="submit" className="btn-ghost">
                      Enregistrer
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-ink-muted">Personne n&apos;a encore réservé en ligne.</p>
        )}

        {waiting.length > 0 && (
          <>
            <h3 className="headline mt-8 text-2xl">Liste d&apos;attente ({waiting.length})</h3>
            <ol className="mt-3 space-y-2">
              {waiting.map((p) => (
                <li key={p.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas-deep px-4 py-2 text-sm">
                  <span className="font-semibold">{p.player_name}</span>
                  {p.phone && (
                    <a href={`https://wa.me/${p.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary hover:underline">
                      {p.phone}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {/* Result */}
      <section aria-labelledby="score" className="mt-10">
        <h2 id="score" className="headline text-3xl">
          Score
        </h2>
        {started ? (
          <form action={setResult} className="card mt-4 grid gap-4 p-6 sm:grid-cols-[1fr_6rem_6rem_1fr]">
            <input type="hidden" name="match_id" value={match.id} />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Équipe 1</span>
              <input className="input" name="home_name" maxLength={40} defaultValue={match.home_name ?? ""} placeholder="Ex : Vikings" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Buts</span>
              <input className="input" name="home_score" inputMode="numeric" pattern="\d{0,2}" defaultValue={match.home_score ?? ""} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Buts</span>
              <input className="input" name="away_score" inputMode="numeric" pattern="\d{0,2}" defaultValue={match.away_score ?? ""} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Équipe 2</span>
              <input className="input" name="away_name" maxLength={40} defaultValue={match.away_name ?? ""} placeholder="Ex : Lions" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold">Homme du match (optionnel)</span>
              <input className="input" name="mvp_name" maxLength={60} defaultValue={match.mvp_name ?? ""} placeholder="Ex : Yassine B." />
            </label>
            <div className="flex items-end sm:col-span-2">
              <button type="submit" className="btn-primary w-full sm:w-auto">
                Enregistrer le score
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-ink-muted">Le score se saisit après le coup d&apos;envoi.</p>
        )}
      </section>

      {started && (
        <section aria-labelledby="avis" className="mt-10">
          <h2 id="avis" className="headline text-3xl">
            Avis des joueurs
          </h2>
          {feedback && feedback.answers > 0 ? (
            <div className="card mt-4 p-6">
              <p className="text-sm text-ink-muted">
                {feedback.answers} réponse{feedback.answers > 1 ? "s" : ""} (notes de 1 à 3)
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-4">
                <Score label="Organisation" value={feedback.organisation} />
                <Score label="Arbitrage" value={feedback.refereeing} />
                <Score label="Intensité" value={feedback.intensity} />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Niveau du match</dt>
                  <dd className="mt-1 font-semibold">{levelLabel(feedback.level_vote)}</dd>
                </div>
              </dl>
              {!!feedback.comments?.length && (
                <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
                  {feedback.comments.map((c, i) => (
                    <li key={i} className="rounded-xl bg-canvas-deep px-4 py-2">
                      « {c} »
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="mt-4 text-ink-muted">Aucun avis pour l&apos;instant. Les joueurs présents peuvent répondre depuis leur compte, de 1 h à 49 h après le coup d&apos;envoi.</p>
          )}
        </section>
      )}

      {started && (
        <section aria-labelledby="photos" className="mt-10">
          <h2 id="photos" className="headline text-3xl">
            Photos et vidéos
          </h2>
          <p className="mt-1 mb-4 text-sm text-ink-muted">Privées : seuls le staff et les joueurs marqués présents les voient, sur la page publique du match.</p>
          <MatchMedia matchId={match.id} manage />
        </section>
      )}

      {isAdmin && (
        <>
          <section aria-labelledby="modifier" className="mt-10">
            <h2 id="modifier" className="headline text-3xl">
              Modifier le match
            </h2>
            <div className="mt-4">
              <MatchForm action={updateMatch} match={match} pitches={(pitches ?? []) as Pitch[]} staff={staff ?? []} submitLabel="Enregistrer" />
            </div>
          </section>

          <section aria-labelledby="actions" className="mt-10">
            <h2 id="actions" className="headline text-3xl">
              Actions
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <form action={duplicateMatch} className="flex items-center gap-2">
                <input type="hidden" name="id" value={match.id} />
                <select name="days" defaultValue="7" className="input w-auto py-2" aria-label="Décalage">
                  <option value="1">+1 jour</option>
                  <option value="7">+1 semaine</option>
                  <option value="14">+2 semaines</option>
                </select>
                <button type="submit" className="btn-ghost">
                  Dupliquer
                </button>
              </form>
              <form action={setMatchStatus}>
                <input type="hidden" name="id" value={match.id} />
                <input type="hidden" name="status" value={match.status === "cancelled" ? "published" : "cancelled"} />
                <button type="submit" className="btn-ghost">
                  {match.status === "cancelled" ? "Rétablir le match" : "Annuler le match"}
                </button>
              </form>
              <form action={deleteMatch}>
                <input type="hidden" name="id" value={match.id} />
                <button type="submit" className="btn border border-red-300 bg-surface text-red-700 hover:border-red-600">
                  Supprimer
                </button>
              </form>
            </div>
            <p className="mt-2 text-xs text-ink-muted">Supprimer n&apos;est possible que si personne n&apos;est inscrit en ligne. Sinon, annule le match.</p>
          </section>
        </>
      )}
    </>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value == null ? "—" : `${Number(value).toFixed(1)} / 3`}</dd>
    </div>
  );
}

/** Average of -1 (too easy) … +1 (too hard). */
function levelLabel(v: number | null): string {
  if (v == null) return "—";
  const n = Number(v);
  if (n <= -0.34) return "Plutôt trop facile";
  if (n >= 0.34) return "Plutôt trop dur";
  return "Bien équilibré";
}
