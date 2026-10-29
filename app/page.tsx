import Link from "next/link";
import InfoStrip from "@/components/InfoStrip";
import MatchCard from "@/components/MatchCard";
import { Icon } from "@/components/Icons";
import RelativeDay from "@/components/RelativeDay";
import ResultCard from "@/components/ResultCard";
import { formatDay, formatTime, isFull, spotsLeft } from "@/lib/matches";
import { getRecentResults, getUpcomingMatches } from "@/lib/matches-source";
import { whatsappLink } from "@/lib/config";

// Re-render every 5 min (MATCHES_REVALIDATE_SECONDS) to pick up sheet edits.
export const revalidate = 300;

const STEPS = [
  {
    n: "01",
    title: "Choisis un match",
    text: "5v5, 7v7 ou 9v9 — filtre par jour, quartier et niveau. Y a toujours un match pour toi.",
  },
  {
    n: "02",
    title: "Réserve",
    text: "Un clic, ton prénom, et on confirme ta place sur WhatsApp. Bla compte, bla app.",
  },
  {
    n: "03",
    title: "Pointe-toi",
    text: "Arrive 10 min avant avec tes crampons. Les équipes, le ballon, les chasubles : c'est nous.",
  },
];

const FAQ = [
  {
    q: "Je viens seul, c'est possible ?",
    a: "Bien sûr. La majorité des joueurs viennent seuls ou à deux. On équilibre les équipes sur place — ghir aji.",
  },
  {
    q: "Comment je paie ?",
    a: "Sur place, en espèces ou par virement avant le match. Le prix est indiqué sur chaque match, en MAD par joueur.",
  },
  {
    q: "C'est quoi les niveaux ?",
    a: "Débutant, Intermédiaire, Confirmé ou Tous niveaux. Sois honnête avec toi-même, tout le monde passe un meilleur match.",
  },
  {
    q: "Et si je dois annuler ?",
    a: "Préviens-nous sur WhatsApp au moins 24h avant pour libérer ta place. Au-delà, la place reste due.",
  },
  {
    q: "Il faut ramener quoi ?",
    a: "Crampons moulés ou baskets selon le terrain, une bouteille d'eau, et la motivation. Le reste on gère.",
  },
];

export default async function HomePage() {
  const [allUpcoming, results] = await Promise.all([getUpcomingMatches(), getRecentResults(4)]);
  const upcoming = allUpcoming.slice(0, 3);
  const nextOpen = allUpcoming.find((m) => !isFull(m));
  const openMatches = allUpcoming.filter((m) => !isFull(m));
  const minPrice = allUpcoming.length > 0 ? Math.min(...allUpcoming.map((m) => m.priceMad)) : null;
  const pitchCount = new Set(allUpcoming.map((m) => m.pitch)).size;
  const formats = ["5v5", "7v7", "9v9"].filter((f) => allUpcoming.some((m) => m.format === f));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #1E8E5A 1px, transparent 1px), linear-gradient(to bottom, #1E8E5A 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="container-page relative grid items-end gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_22rem] lg:py-28">
          <div>
            <p className="eyebrow">Football · Marrakech</p>
            <h1 className="headline mt-4 text-[22vw] sm:text-[11rem] lg:text-[8.5rem] xl:text-[9.5rem]">
              Aji tl3ab<span className="text-primary">.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-muted sm:text-xl">
              Rejoins des matchs <strong className="text-ink">5v5, 7v7 et 9v9</strong> partout à Marrakech.
              Seul ou avec tes potes, tu réserves ta place, on s&apos;occupe du terrain et des équipes.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/jouer" className="btn-primary px-8 py-4 text-base">
                Réserve ta place
              </Link>
              <a href="#comment-ca-marche" className="btn-ghost px-8 py-4 text-base">
                Kifach ? Comment ça marche
              </a>
            </div>
          </div>

          {nextOpen && (
            <Link
              href="/jouer"
              className="group block rounded-2xl bg-forest p-6 text-white shadow-xl shadow-forest/20 transition hover:bg-forest-light"
            >
              <p className="eyebrow flex items-center gap-2 text-highlight">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-highlight opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-highlight" />
                </span>
                Prochain match
              </p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white/70">
                    <span className="capitalize">{formatDay(nextOpen.date)}</span>
                    <RelativeDay date={nextOpen.date} />
                  </p>
                  <p className="headline mt-1 text-6xl">{formatTime(nextOpen.time)}</p>
                </div>
                <span className="headline rounded-lg bg-highlight px-3 py-1.5 text-2xl text-highlight-ink">{nextOpen.format}</span>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm">
                <Icon name="pin" className="h-4 w-4 text-highlight" />
                <span className="font-semibold">{nextOpen.pitch}</span>
                {nextOpen.area && <span className="text-white/70">· {nextOpen.area}</span>}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-forest-light pt-4">
                <p className="text-sm">
                  <span className="font-bold text-highlight">{spotsLeft(nextOpen)}</span>{" "}
                  {spotsLeft(nextOpen) > 1 ? "places" : "place"} · <span className="font-bold">{nextOpen.priceMad} MAD</span>
                </p>
                <span className="text-sm font-bold uppercase tracking-wide text-highlight group-hover:underline">Réserver →</span>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Quick facts */}
      {allUpcoming.length > 0 && (
        <section className="container-page -mt-px pt-10 sm:pt-12" aria-label="En bref">
          <InfoStrip
            items={[
              { icon: "cash", label: "Prix", value: minPrice !== null ? `Dès ${minPrice} MAD / joueur` : "Sur chaque match" },
              { icon: "ball", label: "Formats", value: formats.join(" · ") },
              { icon: "pin", label: "Terrains", value: `${pitchCount} ${pitchCount > 1 ? "terrains" : "terrain"} à Marrakech` },
              { icon: "calendar", label: "À venir", value: `${openMatches.length} ${openMatches.length > 1 ? "matchs ouverts" : "match ouvert"}` },
            ]}
          />
        </section>
      )}

      {/* How it works */}
      <section id="comment-ca-marche" className="container-page scroll-mt-20 py-16 sm:py-24">
        <p className="eyebrow">Comment ça marche</p>
        <h2 className="headline mt-3 text-5xl sm:text-7xl">3 étapes, c&apos;est tout</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card p-6">
              <span className="headline text-6xl text-primary">{s.n}</span>
              <h3 className="headline mt-4 text-3xl">{s.title}</h3>
              <p className="mt-2 text-ink-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Upcoming matches */}
      <section className="border-y border-line bg-canvas-deep">
        <div className="container-page py-16 sm:py-24">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Prochains matchs</p>
              <h2 className="headline mt-3 text-5xl sm:text-7xl">Ça joue bientôt</h2>
            </div>
            <Link href="/jouer" className="text-sm font-bold uppercase tracking-wide text-primary hover:underline">
              Voir tous les matchs →
            </Link>
          </div>
          {upcoming.length > 0 ? (
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {upcoming.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  action={
                    isFull(m) ? (
                      <span className="btn-ghost cursor-default px-5 py-2.5 opacity-50">Complet</span>
                    ) : (
                      <Link href="/jouer" className="btn-primary px-5 py-2.5">
                        Réserver
                      </Link>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="card mt-10 p-8 text-center">
              <p className="headline text-3xl">Nouveaux matchs très bientôt</p>
              <p className="mt-2 text-ink-muted">Suis-nous sur Instagram ou écris-nous sur WhatsApp pour être prévenu.</p>
            </div>
          )}
        </div>
      </section>

      {/* Results history */}
      {results.length > 0 && (
        <section id="historique" className="container-page scroll-mt-20 pt-16 sm:pt-24">
          <p className="eyebrow">Historique</p>
          <h2 className="headline mt-3 text-5xl sm:text-7xl">Derniers résultats</h2>
          <p className="mt-4 max-w-xl text-ink-muted">Chkoun rbe7 ? Les scores des derniers matchs, et le MVP de chaque soirée.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {results.map((m) => (
              <ResultCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Kids + Merch teasers */}
      <section className="container-page grid gap-4 py-16 sm:py-24 md:grid-cols-2">
        <Link href="/kids" className="card group relative overflow-hidden p-8 transition hover:border-primary sm:p-10">
          <p className="eyebrow">Kids Academy</p>
          <h2 className="headline mt-3 text-5xl sm:text-6xl">
            Sghar f l&apos;3mer, <span className="text-primary">kbar</span> f terrain
          </h2>
          <p className="mt-4 max-w-sm text-ink-muted">
            Entraînements encadrés pour les 5–14 ans, par groupes d&apos;âge, avec des coachs diplômés.
          </p>
          <span className="mt-8 inline-block text-sm font-bold uppercase tracking-wide text-primary group-hover:underline">
            Découvrir l&apos;académie →
          </span>
        </Link>
        <Link href="/merch" className="group relative overflow-hidden rounded-2xl bg-forest p-8 text-white transition hover:bg-forest-light sm:p-10">
          <p className="eyebrow text-highlight">Merch</p>
          <h2 className="headline mt-3 text-5xl sm:text-6xl">
            Porte les <span className="text-highlight">couleurs</span>
          </h2>
          <p className="mt-4 max-w-sm opacity-80">
            Maillots, t-shirts et casquettes AJI TL3AB. Certaines pièces en précommande — premier arrivé, premier servi.
          </p>
          <span className="mt-8 inline-block text-sm font-bold uppercase tracking-wide text-highlight group-hover:underline">
            Voir la boutique →
          </span>
        </Link>
      </section>

      {/* FAQ */}
      <section className="border-t border-line">
        <div className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="headline mt-3 text-5xl sm:text-7xl">Des questions ?</h2>
            <p className="mt-4 text-ink-muted">Ma l9itich jawab ? Écris-nous directement.</p>
            <a
              href={whatsappLink("Salam, 3ndi wa7d so2al :")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost mt-6"
            >
              Poser une question
            </a>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="headline text-3xl text-primary transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
