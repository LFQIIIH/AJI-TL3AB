import type { Metadata } from "next";
import InfoStrip from "@/components/InfoStrip";
import { Icon, type IconName } from "@/components/Icons";
import KidsSignup from "./KidsSignup";

export const metadata: Metadata = {
  title: "Enfants",
  description:
    "Matchs de foot et activités encadrés pour les enfants de 5 à 14 ans à Marrakech. Les parents réservent, on s'occupe du reste : jeu, encadrement et plaisir.",
};

const STEPS = [
  { n: "01", title: "Vous réservez", text: "Sur WhatsApp, avec le prénom et l'âge de votre enfant. On vous donne la date, l'heure et le terrain." },
  { n: "02", title: "Vous l'amenez", text: "Au terrain, 10 minutes avant le début. En tenue de sport, avec une bouteille d'eau." },
  { n: "03", title: "On s'occupe du reste", text: "On forme les équipes, on organise le jeu, on encadre et on guide les enfants du début à la fin." },
  { n: "04", title: "Vous le récupérez", text: "Fatigué, souriant et pressé de revenir. 😄" },
];

const ACTIVITIES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "ball",
    title: "Matchs entre enfants",
    text: "De vrais matchs, avec des équipes équilibrées selon l'âge et le niveau. On arbitre pour que tout le monde joue et touche le ballon.",
  },
  {
    icon: "level",
    title: "Jeux et défis",
    text: "Parcours, conduite de balle, tirs au but, petits défis en équipe : on apprend en s'amusant.",
  },
  {
    icon: "users",
    title: "Conseils et encouragements",
    text: "On guide chaque enfant pendant le jeu : une passe, un placement, un geste. Toujours avec bienveillance.",
  },
  {
    icon: "shield",
    title: "Esprit d'équipe",
    text: "Respecter les autres, encourager ses coéquipiers, accepter de perdre et gagner avec le sourire.",
  },
];

const GROUPS = [
  { ages: "5–7 ans", text: "Jeux avec ballon, petits matchs et beaucoup de plaisir." },
  { ages: "8–10 ans", text: "Matchs sur petit terrain, défis et premiers conseils de jeu." },
  { ages: "11–14 ans", text: "Matchs plus intenses, placement et esprit d'équipe." },
];

const ROLE = [
  { title: "Le plaisir d'abord", text: "Ici, pas de pression ni de résultat à tout prix : l'objectif, c'est que votre enfant s'amuse." },
  { title: "Un adulte toujours présent", text: "Les enfants sont encadrés du début à la fin de l'activité, sur le terrain comme sur le banc." },
  { title: "Des groupes par âge", text: "Les enfants jouent avec des enfants de leur âge, pour que ce soit juste et sans danger." },
  { title: "Remis à leurs parents", text: "À la fin, chaque enfant repart avec ses parents ou une personne que vous avez désignée." },
];

export default function KidsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="container-page py-16 sm:py-24">
          <p className="eyebrow">Enfants · La fierté de demain</p>
          <h1 className="headline mt-4 text-6xl sm:text-8xl lg:text-9xl">
            Sghar f l&apos;3mer,
            <br />
            <span className="text-primary">kbar</span> f terrain.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-muted">
            Chers parents : on organise des matchs de foot et des activités pour les enfants. Vous réservez, vous les amenez au
            terrain, et on s&apos;occupe du reste. Notre rôle : qu&apos;ils s&apos;amusent, les guider et veiller sur eux du début à
            la fin.
          </p>
          <p className="mt-4 max-w-2xl rounded-xl bg-highlight/40 px-4 py-3 text-sm font-semibold text-highlight-ink">
            Ce n&apos;est pas une académie : vous réservez quand vous voulez, pour une activité à la fois.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <KidsSignup className="btn-primary px-8 py-4 text-base" />
            <a href="#comment" className="btn-ghost px-8 py-4 text-base">
              Comment ça se passe ?
            </a>
          </div>
          <InfoStrip
            className="mt-10"
            items={[
              { icon: "users", label: "Âge", value: "De 5 à 14 ans" },
              { icon: "ball", label: "Activités", value: "Matchs, jeux et défis" },
              { icon: "shield", label: "Encadrement", value: "Du début à la fin" },
              { icon: "chat", label: "Réservation", value: "Sur WhatsApp" },
            ]}
          />
        </div>
      </section>

      {/* How it works */}
      <section id="comment" className="container-page scroll-mt-20 py-16 sm:py-24">
        <p className="eyebrow">Comment ça se passe</p>
        <h2 className="headline mt-3 text-5xl sm:text-7xl">Simple pour les parents</h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="card p-6">
              <span className="headline text-5xl text-primary">{s.n}</span>
              <h3 className="headline mt-3 text-3xl">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Activities */}
      <section className="border-y border-line bg-canvas-deep">
        <div className="container-page py-16 sm:py-24">
          <p className="eyebrow">Au programme</p>
          <h2 className="headline mt-3 text-5xl sm:text-7xl">Ce qu&apos;on fait avec eux</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ACTIVITIES.map((a) => (
              <div key={a.title} className="card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-highlight text-highlight-ink">
                  <Icon name={a.icon} className="h-6 w-6" />
                </span>
                <h3 className="headline mt-4 text-3xl">{a.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{a.text}</p>
              </div>
            ))}
          </div>

          <h3 className="headline mt-14 text-4xl">Par tranche d&apos;âge</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {GROUPS.map((g) => (
              <div key={g.ages} className="card p-6">
                <p className="headline text-5xl text-primary">{g.ages}</p>
                <p className="mt-2 text-ink-muted">{g.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our role */}
      <section className="container-page py-16 sm:py-24">
        <p className="eyebrow">Notre rôle</p>
        <h2 className="headline mt-3 text-5xl sm:text-7xl">S&apos;amuser, en confiance</h2>
        <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {ROLE.map((r) => (
            <li key={r.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-ink">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>
              <div>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{r.text}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Dates + booking */}
        <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-2xl bg-forest p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div>
            <h3 className="headline text-4xl">Prochaines activités</h3>
            <p className="mt-2 max-w-xl text-white/70">
              Les dates sont annoncées sur WhatsApp et Instagram. Envoyez-nous le prénom et l&apos;âge de votre enfant : on vous
              donne les prochaines dates, l&apos;heure, le terrain et le prix.
            </p>
          </div>
          <KidsSignup className="btn shrink-0 bg-highlight px-8 py-4 text-base text-highlight-ink hover:bg-highlight/90" />
        </div>
      </section>
    </>
  );
}
