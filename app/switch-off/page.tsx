import type { Metadata } from "next";
import InfoStrip from "@/components/InfoStrip";
import { Icon, WhatsAppIcon, type IconName } from "@/components/Icons";
import SessionSignups from "@/components/SessionSignups";
import { whatsappLink } from "@/lib/config";
import { formatDay, formatTime } from "@/lib/matches";
import { SWITCHOFF_CAPACITY, SWITCHOFF_PRICE_MAD } from "@/lib/switchoff";
import { sessionPlace, SESSIONS_SHOWN, TRAINER_NAME, TRAINING_PLACE } from "@/lib/training";
import { getSwitchOffSessions } from "@/lib/training-source";
import { pageMetadata } from "@/lib/seo";
import PageSeo from "@/components/PageSeo";
import RelatedLinks from "@/components/RelatedLinks";
import { sessionsSchema } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata("switchOff");

// Re-render every 5 min to pick up changes in the sheet's "SwitchOff" tab.
export const revalidate = 300;

const FOR_WHO = [
  "Tu enchaînes réunions, mails et écrans toute la semaine.",
  "Tu as envie de bouger sans pression, quel que soit ton niveau.",
  "Tu viens seul, entre amis ou avec tes collègues : tout le monde joue.",
];

const PROGRAM: { icon: IconName; title: string; text: string }[] = [
  { icon: "shield", title: "Réveil du corps", text: "Un training guidé par le coach : échauffement, cardio et gainage pour lancer la matinée." },
  { icon: "ball", title: "Mini-matchs", text: "Des petits matchs en équipes qui tournent. Tout le monde touche le ballon, personne ne reste sur le banc." },
  { icon: "level", title: "Activité & défis", text: "Tirs au but, défis techniques, jeux d'équipe : on rigole, on se challenge." },
  { icon: "chat", title: "Pause & échanges", text: "On souffle, on discute, on fait connaissance. Tu repars vidé… dans le bon sens." },
];

export default async function SwitchOffPage() {
  const sessions = await getSwitchOffSessions();
  const next = sessions[0];
  const places = new Set(sessions.map(sessionPlace));

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="container-page py-16 sm:py-24">
          <PageSeo
            page="switchOff"
            schema={sessionsSchema(sessions.slice(0, SESSIONS_SHOWN), {
              name: "Switch Off : sport du week-end à Marrakech",
              description: `Training, mini-matchs et activités avec le coach ${TRAINER_NAME}, le week-end à 9h. ${SWITCHOFF_CAPACITY} places.`,
              priceMad: SWITCHOFF_PRICE_MAD,
              page: "switchOff",
            })}
          />
          <h1 className="eyebrow">Switch Off : sport le week-end à Marrakech · Coach {TRAINER_NAME}</h1>
          <p className="headline mt-4 text-6xl sm:text-8xl lg:text-9xl">
            Sedd l&apos;PC.
            <br />
            <span className="text-primary">Jiii</span> l&apos;terrain.
          </p>
          <p className="mt-6 max-w-2xl text-lg text-ink-muted">
            Ta pause du week-end, loin des écrans, des mails et des réunions. Chaque samedi et dimanche à 9h : training, mini-matchs
            et activités avec le coach {TRAINER_NAME}, sur le terrain et en plein air.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="#seances" className="btn-primary px-8 py-4 text-base">
              Réserver ma place
            </a>
            <a href="#programme" className="btn-ghost px-8 py-4 text-base">
              Comment ça se passe ?
            </a>
          </div>
          <InfoStrip
            className="mt-10"
            items={[
              {
                icon: "calendar",
                label: next ? "Prochaine séance" : "Quand",
                value: next
                  ? `${formatDay(next.date).replace(/^./, (c) => c.toUpperCase())} · ${formatTime(next.time)}`
                  : "Samedi et dimanche · 9h00",
              },
              { icon: "users", label: "Coach", value: TRAINER_NAME },
              { icon: "cash", label: "Prix", value: `${SWITCHOFF_PRICE_MAD} MAD / séance` },
              { icon: "ball", label: "Places", value: `${SWITCHOFF_CAPACITY} par séance` },
            ]}
          />
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
            <Icon name="pin" className="h-4 w-4 text-primary" />
            {places.size === 1 ? [...places][0] : places.size > 1 ? "Lieu indiqué sur chaque séance" : TRAINING_PLACE}
          </p>
        </div>
      </section>

      {/* For who */}
      <section className="container-page py-16 sm:py-24">
        <p className="eyebrow">Pour qui ?</p>
        <h2 className="headline mt-3 text-5xl sm:text-7xl">Pour ceux qui ne s&apos;arrêtent jamais</h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {FOR_WHO.map((t) => (
            <li key={t} className="card flex gap-3 p-6">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-ink">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>
              <p className="font-semibold">{t}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Program */}
      <section id="programme" className="scroll-mt-20 border-y border-line bg-canvas-deep">
        <div className="container-page py-16 sm:py-24">
          <p className="eyebrow">Au programme</p>
          <h2 className="headline mt-3 text-5xl sm:text-7xl">Ta matinée Switch Off</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROGRAM.map((p, i) => (
              <li key={p.title} className="card p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-highlight text-highlight-ink">
                    <Icon name={p.icon} className="h-6 w-6" />
                  </span>
                  <span className="headline text-4xl text-line-strong">0{i + 1}</span>
                </div>
                <h3 className="headline mt-4 text-3xl">{p.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Sessions */}
      <section id="seances" className="container-page scroll-mt-20 py-16 sm:py-24">
        <p className="eyebrow">Prochaines séances</p>
        <h2 className="headline mt-3 text-5xl sm:text-7xl">Réserve ta place</h2>
        <p className="mt-4 max-w-2xl text-ink-muted">
          {SWITCHOFF_CAPACITY} places par séance, premier arrivé, premier servi. Tu peux annuler jusqu&apos;au début de la séance
          pour libérer ta place.
        </p>
        <div className="mt-8">
          <SessionSignups
            sessions={sessions}
            program={{
              table: "switchoff_signups",
              countsRpc: "switchoff_session_counts",
              mode: "capacity",
              goal: SWITCHOFF_CAPACITY,
              whatsappLabel: "à Switch Off",
            }}
          />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl bg-forest p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="eyebrow text-highlight">Tarif</p>
            <p className="mt-2">
              <span className="headline text-6xl text-highlight">{SWITCHOFF_PRICE_MAD}</span>{" "}
              <span className="text-white/70">MAD la séance · paiement sur place</span>
            </p>
          </div>
          <a
            href={whatsappLink("Salam ! J'ai une question sur Switch Off :")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn shrink-0 bg-highlight px-6 py-3 text-highlight-ink hover:bg-highlight/90"
          >
            <WhatsAppIcon /> Une question ?
          </a>
        </div>
      </section>
      <RelatedLinks page="switchOff" className="container-page border-t border-line py-16 sm:py-20" />
    </>
  );
}
