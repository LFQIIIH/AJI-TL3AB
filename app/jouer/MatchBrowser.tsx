"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Match, MatchFormat } from "@/data/matches";
import MatchCard from "@/components/MatchCard";
import Modal from "@/components/Modal";
import { WhatsAppIcon } from "@/components/Icons";
import { whatsappLink } from "@/lib/config";
import { formatDay, formatDayLong, formatTime, isFull, matchStart, spotsLeft } from "@/lib/matches";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseClient } from "@/lib/supabase/lazy";
import { publicRpc } from "@/lib/supabase/publicApi";
import { useSessionUser } from "@/lib/supabase/useSession";
import { useMatchCounts, withOnlineBookings } from "@/lib/useMatchCounts";
import { SHOE_RENTAL_MAD, SHOE_SIZES } from "@/lib/shoes";

const FORMATS: MatchFormat[] = ["5v5", "7v7", "9v9"];
const NAME_KEY = "ajitl3ab:playerName";

function readSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // storage unavailable — not critical
  }
}

type Mine = { bookings: Map<string, number>; waiting: Map<string, string | null> };
type ModalState =
  | { kind: "guest"; match: Match }
  | { kind: "member"; match: Match }
  | { kind: "booked"; match: Match; guests: number; shoes: Shoes }
  | null;

/** Rented pair sizes for the player and the +1 friend: null = no rental, 0 = ticked but no size yet. */
type Shoes = { me: number | null; friend: number | null };
const NO_SHOES: Shoes = { me: null, friend: null };

function shoeLines(shoes: Shoes): string[] {
  return [
    ...(shoes.me ? [`👟 Location chaussures : pointure ${shoes.me} (+${SHOE_RENTAL_MAD} MAD)`] : []),
    ...(shoes.friend ? [`👟 Chaussures pour mon pote : pointure ${shoes.friend} (+${SHOE_RENTAL_MAD} MAD)`] : []),
  ];
}

const BOOKING_ERRORS: Record<string, string> = {
  shoes_unavailable: "Cette pointure vient d'être réservée. Choisis-en une autre.",
  full: "Le match vient d'être complet. Inscris-toi sur la liste d'attente.",
  already_booked: "Tu es déjà inscrit à ce match.",
  match_started: "Ce match a déjà commencé.",
  profile_missing: "Complète ton profil avant de réserver.",
  not_signed_in: "Ta session a expiré. Reconnecte-toi.",
};

export default function MatchBrowser({ matches }: { matches: Match[] }) {
  const [day, setDay] = useState<string | null>(null);
  const [format, setFormat] = useState<MatchFormat | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [name, setName] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [shoes, setShoes] = useState<Shoes>(NO_SHOES);
  const [shoeStock, setShoeStock] = useState<Record<number, number> | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const user = useSessionUser();
  const [profileName, setProfileName] = useState<string | null | undefined>(undefined);
  const [mine, setMine] = useState<Mine>({ bookings: new Map(), waiting: new Map() });
  const [busyId, setBusyId] = useState<string | null>(null);

  const ids = useMemo(() => matches.map((m) => m.id), [matches]);
  const { counts, reload: reloadCounts } = useMatchCounts(ids);
  const live = useMemo(() => matches.map((m) => withOnlineBookings(m, counts)), [matches, counts]);

  const loadMine = useCallback(async () => {
    if (!user) {
      setMine({ bookings: new Map(), waiting: new Map() });
      setProfileName(user === null ? null : undefined);
      return;
    }
    const client = await supabaseClient();
    const [profile, bookings, waiting] = await Promise.all([
      client.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      client.from("bookings").select("match_id, guests").in("match_id", ids),
      client.from("waitlist").select("match_id, promoted_at").in("match_id", ids),
    ]);
    setProfileName((profile.data as { full_name: string } | null)?.full_name ?? null);
    setMine({
      bookings: new Map(((bookings.data ?? []) as { match_id: string; guests: number }[]).map((b) => [b.match_id, b.guests])),
      waiting: new Map(((waiting.data ?? []) as { match_id: string; promoted_at: string | null }[]).map((w) => [w.match_id, w.promoted_at])),
    });
  }, [user, ids]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const isMember = Boolean(user && profileName);

  const days = useMemo(() => Array.from(new Set(matches.map((m) => m.date))), [matches]);
  const formats = FORMATS.filter((f) => matches.some((m) => m.format === f));
  const areas = useMemo(
    () => Array.from(new Set(matches.map((m) => m.area).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")),
    [matches],
  );

  const filtered = live.filter(
    (m) =>
      (day === null || m.date === day) &&
      (format === null || m.format === format) &&
      (area === null || m.area === area),
  );
  const filtering = day !== null || format !== null || area !== null;
  const openCount = filtered.filter((m) => !isFull(m)).length;

  function resetFilters() {
    setDay(null);
    setFormat(null);
    setArea(null);
  }

  async function loadShoeStock(m: Match) {
    setShoeStock(null);
    if (!isSupabaseConfigured) return;
    try {
      const rows = await publicRpc<{ size: number; pairs_left: number }>("match_shoe_availability", { p_match_id: m.id });
      setShoeStock(Object.fromEntries(rows.map((r) => [r.size, r.pairs_left])));
    } catch {}
  }

  function openBooking(m: Match) {
    setError("");
    setPlusOne(false);
    setShoes(NO_SHOES);
    loadShoeStock(m);
    if (isMember) {
      setModal({ kind: "member", match: m });
    } else {
      setName((n) => n || readSavedName());
      setModal({ kind: "guest", match: m });
    }
  }

  function matchLines(m: Match) {
    return [
      `⚽ Match ${m.format} — ${m.level}`,
      `📅 ${formatDayLong(m.date)}`,
      `⏰ ${formatTime(m.time)}`,
      `📍 ${m.pitch} (${m.area})`,
      `💰 ${m.priceMad} MAD / joueur`,
    ];
  }

  /** Rentals actually requested (friend only counts with +1). */
  const rented: Shoes = { me: shoes.me || null, friend: plusOne ? shoes.friend || null : null };
  const shoeSizeMissing = shoes.me === 0 || (plusOne && shoes.friend === 0);
  const total = (m: Match) =>
    m.priceMad * (plusOne ? 2 : 1) + SHOE_RENTAL_MAD * ((rented.me ? 1 : 0) + (rented.friend ? 1 : 0));

  function confirmGuestBooking(e: React.FormEvent) {
    e.preventDefault();
    if (modal?.kind !== "guest") return;
    const player = name.trim();
    if (!player) return;
    saveName(player);
    const message = [
      "Salam AJI TL3AB ! Bghit nreservi blasti 👋",
      "",
      ...matchLines(modal.match),
      "",
      `Nom : ${player}${plusOne ? " + 1 pote" : ""}`,
      ...shoeLines(rented),
      ...(rented.me || rented.friend ? ["(chaussures sous réserve de disponibilité)"] : []),
      `Total sur place : ${total(modal.match)} MAD`,
    ].join("\n");
    window.open(whatsappLink(message), "_blank", "noopener,noreferrer");
    setModal(null);
  }

  async function confirmMemberBooking(e: React.FormEvent) {
    e.preventDefault();
    if (modal?.kind !== "member") return;
    setPending(true);
    setError("");
    const guests = plusOne ? 1 : 0;
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: modal.match.id, guests, shoeSize: rented.me, guestShoeSize: rented.friend }),
      });
      if (!res.ok) {
        const { error: code } = (await res.json().catch(() => ({}))) as { error?: string };
        setError(BOOKING_ERRORS[code ?? ""] ?? "La réservation a échoué. Réessaie dans un instant.");
        if (code === "shoes_unavailable") loadShoeStock(modal.match);
      } else {
        setModal({ kind: "booked", match: modal.match, guests, shoes: rented });
      }
    } catch {
      setError("Pas de connexion. Réessaie dans un instant.");
    }
    setPending(false);
    reloadCounts();
    loadMine();
  }

  async function cancelBooking(m: Match) {
    if (!window.confirm(`Annuler ta réservation du ${formatDayLong(m.date)} à ${formatTime(m.time)} ?`)) return;
    setBusyId(m.id);
    await fetch(`/api/reservations?matchId=${encodeURIComponent(m.id)}`, { method: "DELETE" }).catch(() => null);
    await Promise.all([reloadCounts(), loadMine()]);
    setBusyId(null);
  }

  async function toggleWaitlist(m: Match) {
    if (!user) return;
    setBusyId(m.id);
    const client = await supabaseClient();
    if (mine.waiting.has(m.id)) {
      await client.from("waitlist").delete().eq("match_id", m.id).eq("user_id", user.id);
    } else {
      await client.from("waitlist").insert({ match_id: m.id, match_date: m.date, match_start: matchStart(m).toISOString() });
    }
    await Promise.all([reloadCounts(), loadMine()]);
    setBusyId(null);
  }

  function action(m: Match) {
    const busy = busyId === m.id;
    const booked = mine.bookings.get(m.id);
    if (isMember && booked !== undefined) {
      const fromWaitlist = Boolean(mine.waiting.get(m.id));
      return (
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-sm font-bold text-primary">
            ✓ Tu joues{booked ? " +1" : ""}
            {fromWaitlist && <span className="block text-xs font-semibold text-ink-muted">via la liste d&apos;attente</span>}
          </span>
          <button type="button" onClick={() => cancelBooking(m)} disabled={busy} className="text-xs font-semibold text-ink-muted hover:text-ink hover:underline">
            {busy ? "…" : "Annuler"}
          </button>
        </div>
      );
    }
    if (isFull(m)) {
      if (isMember) {
        const waiting = mine.waiting.has(m.id);
        return (
          <button type="button" onClick={() => toggleWaitlist(m)} disabled={busy} className={waiting ? "btn-ghost px-4 py-2.5" : "btn-primary px-4 py-2.5"}>
            {busy ? "…" : waiting ? "En attente · Quitter" : "Liste d'attente"}
          </button>
        );
      }
      return (
        <button type="button" className="btn-ghost px-5 py-2.5" disabled>
          Complet
        </button>
      );
    }
    return (
      <button type="button" className="btn-primary px-5 py-2.5" onClick={() => openBooking(m)}>
        Réserver
      </button>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <FilterRow label="Jour">
          <Chip on={day === null} onClick={() => setDay(null)}>Tous</Chip>
          {days.map((d) => (
            <Chip key={d} on={day === d} onClick={() => setDay(d)}>
              <span className="capitalize">{formatDay(d)}</span>
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Format">
          <Chip on={format === null} onClick={() => setFormat(null)}>Tous</Chip>
          {formats.map((f) => (
            <Chip key={f} on={format === f} onClick={() => setFormat(f)}>{f}</Chip>
          ))}
        </FilterRow>
        {areas.length > 1 && (
          <FilterRow label="Quartier">
            <Chip on={area === null} onClick={() => setArea(null)}>Tous</Chip>
            {areas.map((a) => (
              <Chip key={a} on={area === a} onClick={() => setArea(a)}>{a}</Chip>
            ))}
          </FilterRow>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4" aria-live="polite">
        <p className="text-sm text-ink-muted">
          <span className="font-bold text-ink">{filtered.length}</span> {filtered.length > 1 ? "matchs" : "match"}
          {filtered.length > 0 && (
            <>
              {" "}· <span className="font-bold text-primary">{openCount}</span> {openCount > 1 ? "ouverts" : "ouvert"} à la réservation
            </>
          )}
        </p>
        {filtering && (
          <button type="button" onClick={resetFilters} className="text-sm font-semibold text-primary hover:underline">
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {isSupabaseConfigured && user === null && (
        <p className="mt-4 rounded-xl bg-highlight/30 px-4 py-3 text-sm">
          <Link href="/connexion" className="font-bold text-primary hover:underline">Connecte-toi</Link> pour réserver en un clic,
          rejoindre la liste d&apos;attente et faire compter tes matchs pour le ranking et le tirage au sort du mois.
        </p>
      )}

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const waiting = counts[m.id]?.waiting ?? 0;
            return (
              <div key={m.id} className="flex flex-col">
                <MatchCard match={m} action={action(m)} />
                {isFull(m) && waiting > 0 && (
                  <p className="mt-2 text-center text-xs text-ink-muted">
                    {waiting} {waiting > 1 ? "joueurs" : "joueur"} sur la liste d&apos;attente
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card mt-8 p-8 text-center">
          <p className="headline text-3xl">Walou pour l&apos;instant</p>
          <p className="mt-2 text-ink-muted">Aucun match avec ces filtres. Essaie un autre jour, format ou quartier.</p>
          {filtering && (
            <button type="button" onClick={resetFilters} className="btn-ghost mt-6">
              Voir tous les matchs
            </button>
          )}
        </div>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.kind === "booked" ? "C'est réservé !" : "Réserve ta place"}
      >
        {modal && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-ink">{modal.match.format}</span> ·{" "}
              <span className="capitalize">{formatDayLong(modal.match.date)}</span> · {formatTime(modal.match.time)} ·{" "}
              {modal.match.pitch}
            </p>

            {modal.kind === "guest" && (
              <form onSubmit={confirmGuestBooking} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Smiytek ? (ton prénom)</span>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex : Yassine"
                    autoComplete="given-name"
                    required
                    autoFocus
                    maxLength={60}
                  />
                </label>
                <PlusOne checked={plusOne} onChange={setPlusOne} disabled={spotsLeft(modal.match) < 2} />
                <ShoeRental shoes={shoes} onChange={setShoes} plusOne={plusOne} stock={shoeStock} />
                <p className="text-sm">
                  Total à payer sur place : <span className="font-bold">{total(modal.match)} MAD</span>
                </p>
                <button type="submit" className="btn-primary w-full" disabled={!name.trim() || shoeSizeMissing}>
                  <WhatsAppIcon /> Continuer sur WhatsApp
                </button>
                {isSupabaseConfigured ? (
                  <p className="rounded-xl bg-canvas-deep px-4 py-3 text-xs text-ink-muted">
                    {user ? (
                      <>
                        <Link href="/compte" className="font-bold text-primary hover:underline">Complète ton profil</Link> pour réserver en
                        un clic et faire compter ce match pour le ranking et le tirage au sort.
                      </>
                    ) : (
                      <>
                        Sans compte, ce match ne compte pas pour le ranking ni le tirage au sort du mois.{" "}
                        <Link href="/connexion" className="font-bold text-primary hover:underline">Se connecter</Link>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-center text-xs text-ink-muted">On confirme ta place directement sur WhatsApp.</p>
                )}
              </form>
            )}

            {modal.kind === "member" && (
              <form onSubmit={confirmMemberBooking} className="space-y-4">
                <p className="rounded-xl bg-canvas-deep px-4 py-3 text-sm">
                  Joueur : <span className="font-semibold">{profileName}</span>
                </p>
                <PlusOne checked={plusOne} onChange={setPlusOne} disabled={spotsLeft(modal.match) < 2} />
                <ShoeRental shoes={shoes} onChange={setShoes} plusOne={plusOne} stock={shoeStock} />
                <p className="text-sm">
                  Total à payer sur place :{" "}
                  <span className="font-bold">{total(modal.match)} MAD</span>
                </p>
                <button type="submit" className="btn-primary w-full" disabled={pending || shoeSizeMissing}>
                  {pending ? "Réservation…" : "Confirmer ma réservation"}
                </button>
                {error && (
                  <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}
              </form>
            )}

            {modal.kind === "booked" && (
              <div className="space-y-4">
                <p className="rounded-xl bg-highlight/40 px-4 py-3 text-sm font-semibold text-highlight-ink">
                  ✓ Ta place{modal.guests ? " et celle de ton pote sont réservées" : " est réservée"}. Arrive 10 min avant !
                  {(modal.shoes.me || modal.shoes.friend) && (
                    <span className="mt-1 block">
                      👟 {[modal.shoes.me && `pointure ${modal.shoes.me}`, modal.shoes.friend && `pointure ${modal.shoes.friend} pour ton pote`].filter(Boolean).join(" et ")} : on te l&apos;apporte au terrain.
                    </span>
                  )}
                </p>
                <a
                  href={whatsappLink(
                    ["Salam AJI TL3AB ! J'ai réservé en ligne ✅", "", ...matchLines(modal.match), "", `Nom : ${profileName}${modal.guests ? " + 1 pote" : ""}`, ...shoeLines(modal.shoes)].join("\n"),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost w-full"
                >
                  <WhatsAppIcon /> Prévenir l&apos;équipe (optionnel)
                </a>
                <Link href="/compte" className="block text-center text-sm font-semibold text-primary hover:underline">
                  Voir mes réservations
                </Link>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function ShoeRental({
  shoes,
  onChange,
  plusOne,
  stock,
}: {
  shoes: Shoes;
  onChange: (s: Shoes) => void;
  plusOne: boolean;
  stock: Record<number, number> | null;
}) {
  const on = shoes.me !== null;
  const left = (size: number) => stock?.[size] ?? 2;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${on ? "border-primary bg-highlight/20" : "border-line-strong"}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          checked={on}
          onChange={(e) => onChange(e.target.checked ? { me: 0, friend: null } : { me: null, friend: null })}
        />
        <span className="flex-1">
          <span className="font-semibold">Pas de crampons ? Loue une paire sur place</span>
          <span className="block text-xs text-ink-muted">Chaussures de foot turf, pointures 38 à 45. On n&apos;apporte que les paires réservées.</span>
        </span>
        <span className="shrink-0 font-bold text-primary">+{SHOE_RENTAL_MAD} MAD</span>
      </label>
      {on && (
        <div className="mt-3 space-y-3 pl-7">
          <SizePicker
            label="Ta pointure"
            value={shoes.me}
            onPick={(v) => onChange({ ...shoes, me: v })}
            left={(s) => left(s) - (plusOne && shoes.friend === s ? 1 : 0)}
          />
          {plusOne && (
            <>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={shoes.friend !== null}
                  onChange={(e) => onChange({ ...shoes, friend: e.target.checked ? 0 : null })}
                />
                Une paire pour ton pote aussi (+{SHOE_RENTAL_MAD} MAD)
              </label>
              {shoes.friend !== null && (
                <SizePicker
                  label="Pointure de ton pote"
                  value={shoes.friend}
                  onPick={(v) => onChange({ ...shoes, friend: v })}
                  left={(s) => left(s) - (shoes.me === s ? 1 : 0)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SizePicker({
  label,
  value,
  onPick,
  left,
}: {
  label: string;
  value: number | null;
  onPick: (size: number) => void;
  left: (size: number) => number;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {SHOE_SIZES.map((size) => {
          const soldOut = left(size) <= 0 && value !== size;
          return (
            <button
              key={size}
              type="button"
              disabled={soldOut}
              onClick={() => onPick(size)}
              aria-pressed={value === size}
              title={soldOut ? "Épuisé pour ce match" : undefined}
              className={`chip min-w-11 px-2.5 py-1 text-xs ${value === size ? "chip-on" : "chip-off"} ${soldOut ? "cursor-not-allowed line-through opacity-40" : ""}`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PlusOne({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border border-line-strong px-4 py-3 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-semibold">+1 pote</span>
        <span className="block text-xs text-ink-muted">
          {disabled ? "Plus assez de places pour deux." : "Il paie aussi sur place. Il ne compte pas pour le ranking."}
        </span>
      </span>
    </label>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`chip shrink-0 ${on ? "chip-on" : "chip-off"}`}>
      {children}
    </button>
  );
}
