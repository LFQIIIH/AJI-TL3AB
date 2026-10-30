import type { Metadata } from "next";
import InfoStrip from "@/components/InfoStrip";
import { Icon, WhatsAppIcon } from "@/components/Icons";
import { whatsappLink } from "@/lib/config";
import { formatTime } from "@/lib/matches";
import {
  MIN_PARTICIPANTS,
  PRICE_PER_MONTH_MAD,
  PRICE_PER_SESSION_MAD,
  SESSIONS_PER_MONTH,
  TRAINER_NAME,
  TRAINING_DAYS_LABEL,
  TRAINING_PLACE,
  TRAINING_TIME,
} from "@/lib/training";
import TrainingSessions from "./TrainingSessions";

export const metadata: Metadata = {
  title: "Prépa physique",
  description: `Prépa physique et renforcement du core avec le coach ${TRAINER_NAME} à Marrakech. ${PRICE_PER_SESSION_MAD} MAD la séance ou ${PRICE_PER_MONTH_MAD} MAD par mois.`,
};

const PROGRAM = [
  { icon: "shield", title: "Gainage & core", text: "Abdos profonds, lombaires, stabilité : la base de chaque frappe et de chaque duel." },
  { icon: "ball", title: "Cardio foot", text: "Fractionné, sprints répétés, changements de direction : tenir 90 minutes." },
  { icon: "level", title: "Renforcement", text: "Jambes, hanches, haut du corps au poids du corps et avec élastiques." },
  { icon: "users", title: "Mobilité", text: "Échauffement, étirements et prévention des blessures en fin de séance." },
] as const;

const perSessionWithSub = Math.round(PRICE_PER_MONTH_MAD / SESSIONS_PER_MONTH);
const subscribeMessage = `Salam ! Je veux m'abonner à la prépa physique avec le coach ${TRAINER_NAME} (${PRICE_PER_MONTH_MAD} MAD / mois).`;

export default function PrepaPhysiquePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="container-page py-16 sm:py-24">
          <p className="eyebrow">Prépa physique · Coach {TRAINER_NAME}</p>
          <h1 className="headline mt-4 text-6xl sm:text-8xl lg:text-9xl">
            9wi l&apos;<span className="text-primary">core</span> dyalek.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-muted">
            Gainage, cardio et renforcement pour être plus fort sur le terrain. Des séances en groupe, encadrées par un coach,
            trois fois par semaine à Marrakech.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="#seances" className="btn-primary px-8 py-4 text-base">
              Voir les prochaines séances
            </a>
            <a href="#tarifs" className="btn-ghost px-8 py-4 text-base">
              Tarifs
            </a>
          </div>
          <InfoStrip
            className="mt-10"
            items={[
              { icon: "users", label: "Coach", value: TRAINER_NAME },
              { icon: "calendar", label: "Quand", value: `${TRAINING_DAYS_LABEL[0].toUpperCase()}${TRAINING_DAYS_LABEL.slice(1)} · ${formatTime(TRAINING_TIME)}` },
              { icon: "cash", label: "Séance", value: `${PRICE_PER_SESSION_MAD} MAD` },
              { icon: "gift", label: "Abonnement", value: `${PRICE_PER_MONTH_MAD} MAD / mois` },
            ]}
          />
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
            <Icon name="pin" className="h-4 w-4 text-primary" />
            {TRAINING_PLACE}
          </p>
        </div>
      </section>

      {/* Sessions */}
      <section id="seances" className="container-page scroll-mt-20 py-16 sm:py-24">
        <p className="eyebrow">Prochaines séances</p>
        <h2 className="headline mt-3 text-5xl sm:text-7xl">Inscris-toi</h2>
        <div className="mt-6 flex max-w-3xl gap-4 rounded-2xl bg-forest p-5 text-white sm:p-6">
          <span className="headline flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-highlight text-2xl text-highlight-ink">
            {MIN_PARTICIPANTS}
          </span>
          <div>
            <p className="font-semibold">La séance est lancée à partir de {MIN_PARTICIPANTS} inscrits.</p>
            <p className="mt-1 text-sm text-white/70">
              Inscris-toi en un clic et ramène tes potes : dès que le compteur atteint {MIN_PARTICIPANTS}, la séance est
              confirmée. Sinon, elle n&apos;a pas lieu et tu ne paies rien.
            </p>
          </div>
        </div>
        <div className="mt-8">
          <TrainingSessions />
        </div>
      </section>

      {/* Program */}
      <section className="border-y border-line bg-canvas-deep">
        <div className="container-page py-16 sm:py-24">
          <p className="eyebrow">Au programme</p>
          <h2 className="headline mt-3 text-5xl sm:text-7xl">Une séance type</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROGRAM.map((p) => (
              <div key={p.title} className="card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-highlight text-highlight-ink">
                  <Icon name={p.icon} className="h-6 w-6" />
                </span>
                <h3 className="headline mt-4 text-3xl">{p.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="tarifs" className="container-page scroll-mt-20 py-16 sm:py-24">
        <p className="eyebrow">Tarifs</p>
        <h2 className="headline mt-3 text-5xl sm:text-7xl">Séance ou abonnement</h2>
        <div className="mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="card p-6 sm:p-8">
            <h3 className="font-semibold uppercase tracking-wide">À la séance</h3>
            <p className="mt-4">
              <span className="headline text-7xl">{PRICE_PER_SESSION_MAD}</span>{" "}
              <span className="text-sm text-ink-muted">MAD / séance</span>
            </p>
            <p className="mt-2 text-sm text-ink-muted">Tu viens quand tu veux. Paiement sur place.</p>
            <a href="#seances" className="btn-ghost mt-6 w-full">
              Choisir une séance
            </a>
          </div>
          <div className="card border-2 border-primary p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold uppercase tracking-wide">Abonnement mensuel</h3>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-highlight px-3 py-1 text-xs font-bold uppercase text-highlight-ink">
                Meilleur prix
              </span>
            </div>
            <p className="mt-4">
              <span className="headline text-7xl">{PRICE_PER_MONTH_MAD}</span>{" "}
              <span className="text-sm text-ink-muted">MAD / mois</span>
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Toutes les séances du mois (jusqu&apos;à {SESSIONS_PER_MONTH}), soit environ{" "}
              <strong className="text-ink">{perSessionWithSub} MAD la séance</strong> au lieu de {PRICE_PER_SESSION_MAD}.
            </p>
            <a href={whatsappLink(subscribeMessage)} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 w-full">
              <WhatsAppIcon /> S&apos;abonner
            </a>
          </div>
        </div>
        <p className="mt-4 max-w-4xl text-sm text-ink-muted">
          Abonné ou pas, inscris-toi à chaque séance avec « Je viens » pour qu&apos;elle compte dans les {MIN_PARTICIPANTS}.
        </p>
      </section>
    </>
  );
}
