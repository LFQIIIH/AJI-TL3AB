import type { Metadata } from "next";
import { BRAND_NAME, SITE_URL } from "@/lib/config";

// ─────────────────────────────────────────────────────────────────────────────
// Central SEO config: one entry per indexable page. Titles, descriptions,
// canonical URLs, Open Graph / Twitter tags and breadcrumbs all come from here
// (see pageMetadata() and <PageSeo>); the schema.org builders are in
// lib/structured-data.ts.
//
// Rules: title = topic, keyword first, ~38–48 characters (the " – AJI TL3AB"
// suffix brings it to 50–60). Description = 140–160 characters, what the page
// gives you + a reason to click. Both unique, written in French.
// ─────────────────────────────────────────────────────────────────────────────

export const TITLE_SUFFIX = ` – ${BRAND_NAME}`;


export type PageSeoConfig = {
  path: string;
  /** Topic only, keyword first. The brand is appended. */
  title: string;
  description: string;
  /** Label of this page in the breadcrumb trail (inner pages only). */
  breadcrumb?: string;
};

export const PAGES = {
  home: {
    path: "/",
    title: "Matchs de foot 5v5, 7v7 et 9v9 à Marrakech",
    description:
      "Joue au foot à Marrakech sans rien organiser : réserve ta place dans un match 5v5, 7v7 ou 9v9, seul ou entre amis. Terrain, ballon et équipes fournis.",
  },
  jouer: {
    path: "/jouer",
    title: "Réserver un match de foot à Marrakech en ligne",
    // Fallback; the live description is built from the upcoming matches (jouerDescription).
    description:
      "Tous les matchs de foot à venir à Marrakech en 5v5, 7v7 et 9v9, par jour, quartier et niveau. Viens seul ou entre amis : ta place est réservée en 30 secondes.",
    breadcrumb: "Jouer",
  },
  merch: {
    path: "/merch",
    title: "Maillots de clubs de foot à Marrakech · 199 MAD",
    description:
      "Maillots Real Madrid, Liverpool, Manchester United, Juventus, Bayern, Arsenal et Inter Miami, de S à XL. Livrés partout à Marrakech, paiement à la livraison.",
    breadcrumb: "Maillots",
  },
  switchOff: {
    path: "/switch-off",
    title: "Switch Off : sport le week-end à Marrakech",
    description:
      "Le week-end à 9h, déconnecte des écrans : training, mini-matchs et défis avec un coach, quel que soit ton niveau. 75 MAD la matinée, 20 places seulement.",
    breadcrumb: "Switch Off",
  },
  training: {
    path: "/prepa-physique",
    title: "Training physique en plein air à Marrakech",
    description:
      "Gainage, cardio foot et renforcement en groupe avec le coach Anas Mouatasim, trois soirs par semaine à Marrakech. 50 MAD la séance ou 200 MAD par mois.",
    breadcrumb: "Training physique",
  },
  kids: {
    path: "/kids",
    title: "Foot pour enfants de 5 à 14 ans à Marrakech",
    description:
      "Matchs, jeux et défis encadrés pour les enfants de 5 à 14 ans à Marrakech, par tranche d'âge. Vous réservez sur WhatsApp, on s'occupe du jeu et du reste.",
    breadcrumb: "Enfants",
  },
  classement: {
    path: "/classement",
    title: "Classement des joueurs de foot à Marrakech",
    description:
      "Meilleurs buteurs, gardiens, défenseurs et milieux des matchs AJI TL3AB à Marrakech, l'équipe du mois et le tirage au sort qui offre un match gratuit.",
    breadcrumb: "Classement",
  },
  confidentialite: {
    path: "/confidentialite",
    title: "Confidentialité et protection des données",
    description:
      "Quelles données AJI TL3AB collecte quand tu réserves un match, pourquoi, qui les voit, où elles sont stockées, combien de temps, et comment exercer tes droits.",
    breadcrumb: "Confidentialité",
  },
} satisfies Record<string, PageSeoConfig>;

export type PageKey = keyof typeof PAGES;

export const fullTitle = (topic: string) => `${topic}${TITLE_SUFFIX}`;

/** Canonical form of a site URL: production host, www, no trailing slash (home = bare domain). */
export const canonicalUrl = (path: string) => (path === "/" ? SITE_URL : `${SITE_URL}${path}`);

/** Absolute URL for structured data and images. */
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();

/** Breadcrumb trail of a page: Accueil › Page. */
export function breadcrumbTrail(key: PageKey): { name: string; url: string }[] {
  const page: PageSeoConfig = PAGES[key];
  const home = { name: "Accueil", url: canonicalUrl("/") };
  return page.breadcrumb ? [home, { name: page.breadcrumb, url: canonicalUrl(page.path) }] : [home];
}

/**
 * Next.js metadata for a page in PAGES: title, description, canonical and the
 * Open Graph / Twitter tags. `description` overrides the static one for pages
 * whose description is built from live data.
 */
export function pageMetadata(key: PageKey, overrides: { description?: string } = {}): Metadata {
  const page: PageSeoConfig = PAGES[key];
  const title = fullTitle(page.title);
  const description = overrides.description ?? page.description;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl(page.path) },
    openGraph: {
      type: "website",
      locale: "fr_MA",
      siteName: BRAND_NAME,
      url: canonicalUrl(page.path),
      title,
      description,
      // og:image (+ width, height, alt, type): from the page's opengraph-image.tsx,
      // or the site default app/opengraph-image.tsx.
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ── Descriptions built from data (with fallbacks) ──

/** /jouer: "12 matchs de foot à venir à Marrakech, dès 40 MAD par joueur : …" */
export function jouerDescription(matches: { priceMad: number; format: string }[]): string {
  if (matches.length === 0) return PAGES.jouer.description;
  const n = matches.length;
  const minPrice = Math.min(...matches.map((m) => m.priceMad));
  const formats = ["5v5", "7v7", "9v9"].filter((f) => matches.some((m) => m.format === f));
  const formatText = formats.length > 1 ? `${formats.slice(0, -1).join(", ")} et ${formats.at(-1)}` : formats[0] ?? "5v5";
  return `${n} ${n > 1 ? "matchs" : "match"} de foot à venir à Marrakech, dès ${minPrice} MAD par joueur, en ${formatText}, par jour, quartier et niveau. Viens seul ou entre amis, réserve en 30 secondes.`;
}
