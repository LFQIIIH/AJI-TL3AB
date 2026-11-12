import type { Metadata } from "next";
import Link from "next/link";
import PageSeo from "@/components/PageSeo";
import RelatedLinks from "@/components/RelatedLinks";
import { RULES, RULES_UPDATED } from "@/lib/rules";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("regles");

export default function RulesPage() {
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <PageSeo page="regles" />
      <h1 className="eyebrow">Règlement des matchs AJI TL3AB</h1>
      <p className="headline mt-3 text-6xl sm:text-7xl">
        Les <span className="text-primary">règles</span> du jeu
      </p>
      <p className="mt-4 text-ink-muted">
        Simple : tu réserves, tu viens, tu joues fair-play. Ces règles sont acceptées une fois avant la première réservation.
        Dernière mise à jour : {RULES_UPDATED}.
      </p>

      <div className="mt-10 space-y-8">
        {RULES.map((section) => (
          <section key={section.title}>
            <h2 className="headline text-3xl">{section.title}</h2>
            <ul className="mt-3 space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3 text-ink-muted">
                  <span aria-hidden="true" className="mt-1 text-primary">
                    ●
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 rounded-xl bg-canvas-deep px-4 py-3 text-sm text-ink-muted">
        Une question sur une règle ou un remboursement ?{" "}
        <Link href="/jouer" className="font-semibold text-primary hover:underline">
          Réserve ton prochain match
        </Link>{" "}
        ou écris-nous sur WhatsApp.
      </p>
      <RelatedLinks page="regles" className="mt-16 border-t border-line pt-12" />
    </div>
  );
}
