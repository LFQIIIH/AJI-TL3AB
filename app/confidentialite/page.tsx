import type { Metadata } from "next";
import { whatsappLink } from "@/lib/config";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Comment AJI TL3AB protège tes données personnelles (loi 09-08).",
};

// TODO before launch: fill in the legal entity, address and CNDP declaration number.
const CONTROLLER = "AJI TL3AB [raison sociale à compléter], Marrakech";
const UPDATED = "30 octobre 2026";

const SECTIONS = [
  {
    title: "Ce qu'on collecte",
    body: [
      "Quand tu crées ton profil : ton nom complet, ton numéro de téléphone, ton poste préféré et l'adresse e-mail de ton compte Google.",
      "On ne reçoit jamais ton mot de passe Google.",
    ],
  },
  {
    title: "Pourquoi",
    body: [
      "Gérer tes réservations et te contacter au sujet de tes matchs.",
      "Gérer tes inscriptions aux séances de prépa physique. Le nombre d'inscrits par séance est public, jamais les noms.",
      "Tes réservations en ligne, ta présence aux matchs, tes buts et les votes des autres joueurs : pour le classement, les prix de match et le tirage au sort mensuel.",
      "Le code de parrainage : pour savoir quel pote t'a invité, et lui donner un ticket de plus au tirage."
    ],
  },
  {
    title: "Qui peut voir tes données",
    body: [
      "Ton numéro de téléphone et ton e-mail sont privés : seuls toi et l'équipe AJI TL3AB y ont accès. Les autres joueurs ne les voient jamais.",
      "Sur le classement, les prix de match, l'équipe du mois et le tirage au sort, seuls ton prénom, l'initiale de ton nom (ex : « Yassine B. ») et ton poste apparaissent.",
      "Pour voter, les joueurs d'un même match voient les prénoms (+ initiale) et postes des autres joueurs de ce match.",
      "Les votes sont anonymes : personne ne voit pour qui tu as voté.",
      "On ne vend ni ne partage tes données avec des tiers à des fins commerciales.",
    ],
  },
  {
    title: "Où elles sont stockées",
    body: [
      "Chez notre hébergeur de base de données (Supabase), protégées par un accès sécurisé. La connexion se fait via Google.",
    ],
  },
  {
    title: "Combien de temps",
    body: ["Tant que ton compte existe. Si tu demandes la suppression, tes données sont effacées."],
  },
  {
    title: "Tes droits",
    body: [
      "Conformément à la loi n° 09-08, tu peux accéder à tes données, les rectifier, t'opposer à leur traitement ou demander leur suppression.",
      "Tu peux modifier ton nom, ton téléphone et ton poste à tout moment depuis « Mon compte ». Pour tout le reste, écris-nous sur WhatsApp.",
    ],
  },
];

export default function ConfidentialitePage() {
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">Données personnelles</p>
      <h1 className="headline mt-3 text-6xl sm:text-7xl">Confidentialité</h1>
      <p className="mt-4 text-ink-muted">
        Responsable du traitement : {CONTROLLER}. Dernière mise à jour : {UPDATED}.
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="headline text-3xl">{s.title}</h2>
            <div className="mt-3 space-y-2 text-ink-muted">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <a
        href={whatsappLink("Salam AJI TL3AB, j'ai une demande concernant mes données personnelles :")}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary mt-10"
      >
        Nous contacter sur WhatsApp
      </a>
    </div>
  );
}
