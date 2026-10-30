import type { Metadata } from "next";
import InfoStrip from "@/components/InfoStrip";
import KidsSignup from "./KidsSignup";

export const metadata: Metadata = {
  title: "Académie enfants",
  description:
    "Académie de football pour enfants de 5 à 14 ans à Marrakech. Groupes par âge, coachs diplômés, encadrement sécurisé.",
};

const GROUPS = [
  { name: "Mini-Pousses", ages: "5–7 ans", focus: "Motricité, coordination et plaisir du ballon à travers le jeu.", size: "8 enfants max / coach" },
  { name: "Pousses", ages: "8–10 ans", focus: "Technique de base, passes, conduite de balle, premiers principes collectifs.", size: "10 enfants max / coach" },
  { name: "Juniors", ages: "11–14 ans", focus: "Technique avancée, placement, tactique en 7v7 et esprit d'équipe.", size: "12 enfants max / coach" },
];

const SCHEDULE = [
  { day: "Mercredi", slots: [{ time: "15h00 – 16h00", group: "Mini-Pousses" }, { time: "16h15 – 17h30", group: "Pousses" }] },
  { day: "Samedi", slots: [{ time: "09h30 – 10h30", group: "Mini-Pousses" }, { time: "10h45 – 12h00", group: "Pousses" }, { time: "12h00 – 13h30", group: "Juniors" }] },
  { day: "Dimanche", slots: [{ time: "10h00 – 11h30", group: "Juniors" }] },
];

const COACHES = [
  { name: "Coach Hamza", role: "Directeur technique", bio: "Licence CAF C, 10 ans d'expérience en formation des jeunes.", initials: "H" },
  { name: "Coach Salma", role: "Responsable Mini-Pousses", bio: "Éducatrice sportive diplômée, spécialiste de la petite enfance.", initials: "S" },
  { name: "Coach Youssef", role: "Coach Pousses & Juniors", bio: "Ancien joueur de Botola 2, diplôme d'entraîneur FRMF.", initials: "Y" },
];

const SAFETY = [
  { title: "Coachs diplômés & vérifiés", text: "Tous nos coachs sont certifiés et formés aux premiers secours." },
  { title: "Petits groupes", text: "Un ratio encadrant / enfants adapté à chaque âge, jamais plus de 12." },
  { title: "Terrains sécurisés", text: "Terrains synthétiques fermés, accès contrôlé, vestiaires surveillés." },
  { title: "Trousse de secours & assurance", text: "Kit de premiers soins sur place et assurance incluse pour chaque enfant." },
  { title: "Remise aux parents uniquement", text: "Les enfants ne repartent qu'avec un parent ou une personne autorisée." },
  { title: "Suivi & communication", text: "Groupe WhatsApp parents : horaires, absences et nouvelles après chaque séance." },
];

const PRICES = [
  { label: "Séance d'essai", price: "Offerte", note: "Pour découvrir sans engagement", highlight: false },
  { label: "Mensuel", price: "350", unit: "MAD / mois", note: "1 séance par semaine", highlight: false },
  { label: "Mensuel+", price: "550", unit: "MAD / mois", note: "2 séances par semaine · maillot offert", highlight: true },
];

export default function KidsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="container-page py-16 sm:py-24">
          <p className="eyebrow">Académie enfants · La fierté de demain</p>
          <h1 className="headline mt-4 text-6xl sm:text-8xl lg:text-9xl">
            Sghar f l&apos;3mer,
            <br />
            <span className="text-primary">kbar</span> f terrain.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-muted">
            Chers parents : une académie de foot à Marrakech où vos enfants progressent, se dépensent et apprennent
            l&apos;esprit d&apos;équipe — encadrés par des coachs diplômés, dans un cadre 100% sécurisé.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <KidsSignup className="btn-primary px-8 py-4 text-base" />
            <a href="#tarifs" className="btn-ghost px-8 py-4 text-base">
              Voir les tarifs
            </a>
          </div>
          <p className="mt-4 text-sm text-ink-muted">✔ Première séance offerte · ✔ Sans engagement</p>
          <InfoStrip
            className="mt-10"
            items={[
              { icon: "users", label: "Âge", value: "5 à 14 ans, 3 groupes" },
              { icon: "calendar", label: "Séances", value: "Mercredi, samedi, dimanche" },
              { icon: "pin", label: "Lieu", value: "Complexe Massira" },
              { icon: "cash", label: "Tarif", value: "Dès 350 MAD / mois" },
            ]}
          />
        </div>
      </section>

      {/* Age groups */}
      <section className="container-page py-16 sm:py-24">
        <p className="eyebrow">Groupes d&apos;âge</p>
        <h2 className="headline mt-3 text-5xl sm:text-7xl">Chaque âge, son programme</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.name} className="card p-6">
              <p className="headline text-5xl text-primary">{g.ages}</p>
              <h3 className="headline mt-3 text-3xl">{g.name}</h3>
              <p className="mt-2 text-ink-muted">{g.focus}</p>
              <p className="mt-4 text-sm font-semibold">{g.size}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Schedule */}
      <section className="border-y border-line bg-canvas-deep">
        <div className="container-page py-16 sm:py-24">
          <p className="eyebrow">Planning</p>
          <h2 className="headline mt-3 text-5xl sm:text-7xl">Horaires de la semaine</h2>
          <p className="mt-4 text-ink-muted">Complexe Massira, Marrakech · hors vacances scolaires.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {SCHEDULE.map((d) => (
              <div key={d.day} className="card p-6">
                <h3 className="headline text-4xl">{d.day}</h3>
                <ul className="mt-4 divide-y divide-line">
                  {d.slots.map((s) => (
                    <li key={s.time + s.group} className="flex items-center justify-between gap-3 py-3">
                      <span className="font-semibold">{s.time}</span>
                      <span className="rounded-full bg-line px-3 py-1 text-xs font-semibold">{s.group}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coaches */}
      <section className="container-page py-16 sm:py-24">
        <p className="eyebrow">Le staff</p>
        <h2 className="headline mt-3 text-5xl sm:text-7xl">Nos coachs</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {COACHES.map((c) => (
            <div key={c.name} className="card flex gap-4 p-6">
              <div className="headline flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-highlight text-3xl text-highlight-ink">
                {c.initials}
              </div>
              <div>
                <h3 className="headline text-2xl">{c.name}</h3>
                <p className="text-sm font-semibold text-primary">{c.role}</p>
                <p className="mt-2 text-sm text-ink-muted">{c.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Safety */}
      <section className="border-y border-line bg-canvas-deep">
        <div className="container-page py-16 sm:py-24">
          <p className="eyebrow">Sécurité</p>
          <h2 className="headline mt-3 text-5xl sm:text-7xl">Rassurés, vraiment</h2>
          <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {SAFETY.map((s) => (
              <li key={s.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-ink">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section id="tarifs" className="container-page scroll-mt-20 py-16 sm:py-24">
        <p className="eyebrow">Tarifs</p>
        <h2 className="headline mt-3 text-5xl sm:text-7xl">Simple et clair</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PRICES.map((p) => (
            <div key={p.label} className={`card p-6 ${p.highlight ? "border-2 border-primary" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold uppercase tracking-wide">{p.label}</h3>
                {p.highlight && (
                  <span className="rounded-full bg-highlight px-3 py-1 text-xs font-bold uppercase text-highlight-ink">Populaire</span>
                )}
              </div>
              <p className="mt-4">
                <span className="headline text-6xl">{p.price}</span>{" "}
                {p.unit && <span className="text-sm text-ink-muted">{p.unit}</span>}
              </p>
              <p className="mt-2 text-sm text-ink-muted">{p.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-muted">Réduction de 15% à partir du 2ᵉ enfant inscrit.</p>

        <div className="card mt-12 flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <h3 className="headline text-4xl">Yallah, on commence ?</h3>
            <p className="mt-2 text-ink-muted">Envoyez-nous le prénom et l&apos;âge de votre enfant, on s&apos;occupe du reste.</p>
          </div>
          <KidsSignup className="btn-primary shrink-0 px-8 py-4 text-base" />
        </div>
      </section>
    </>
  );
}
