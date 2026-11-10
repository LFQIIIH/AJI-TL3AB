import Link from "next/link";
import type { PageKey } from "@/lib/seo";

// Contextual links between related pages, with descriptive anchor text.
// One list per page, so every page links to its closest neighbours.

type Target = { href: string; title: string; text: string };

const TARGETS = {
  jouer: { href: "/jouer", title: "Réserver un match de foot à Marrakech", text: "5v5, 7v7 ou 9v9, seul ou entre amis. Terrain, ballon et équipes fournis." },
  parents: { href: "/jouer", title: "Les parents aussi jouent : réserver un match", text: "Vous aussi, réservez votre place dans un match 5v5 ou 7v7 à Marrakech." },
  training: { href: "/prepa-physique", title: "Training physique en plein air", text: "Gainage, cardio et renforcement avec un coach, trois soirs par semaine." },
  switchOff: { href: "/switch-off", title: "Switch Off, le sport du week-end", text: "Training, mini-matchs et défis le samedi et le dimanche à 9h." },
  kids: { href: "/kids", title: "Foot pour enfants de 5 à 14 ans", text: "Matchs, jeux et défis encadrés par tranche d'âge, réservés sur WhatsApp." },
  merch: { href: "/merch", title: "Maillots de foot à 199 MAD", text: "Les maillots des grands clubs en stock, de S à XL, livrés à Marrakech." },
  classement: { href: "/classement", title: "Classement des joueurs et tirage du mois", text: "Meilleurs buteurs, équipe du mois, et un match gratuit à gagner." },
} satisfies Record<string, Target>;

const RELATED: Partial<Record<PageKey, Target[]>> = {
  home: [TARGETS.training, TARGETS.switchOff],
  jouer: [TARGETS.training, TARGETS.classement, TARGETS.kids, TARGETS.merch],
  merch: [TARGETS.jouer, TARGETS.classement, TARGETS.switchOff],
  switchOff: [TARGETS.training, TARGETS.jouer, TARGETS.kids],
  training: [TARGETS.switchOff, TARGETS.jouer, TARGETS.classement],
  kids: [TARGETS.parents, TARGETS.switchOff, TARGETS.training],
  classement: [TARGETS.jouer, TARGETS.training, TARGETS.merch],
};

export default function RelatedLinks({ page, title = "À découvrir aussi", className = "" }: { page: PageKey; title?: string; className?: string }) {
  const links = RELATED[page];
  if (!links?.length) return null;
  return (
    <section aria-labelledby={`related-${page}`} className={className}>
      <h2 id={`related-${page}`} className="headline text-4xl sm:text-5xl">
        {title}
      </h2>
      <ul className={`mt-6 grid gap-4 sm:grid-cols-2 ${links.length > 3 ? "lg:grid-cols-4" : links.length > 2 ? "lg:grid-cols-3" : ""}`}>
        {links.map((l) => (
          <li key={l.title}>
            <Link href={l.href} className="card group block h-full p-5 transition hover:border-primary">
              <span className="block font-semibold text-ink group-hover:text-primary">{l.title} →</span>
              <span className="mt-1 block text-sm text-ink-muted">{l.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
