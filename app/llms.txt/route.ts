import { FAQ } from "@/data/faq";
import { products } from "@/data/products";
import { BRAND_NAME, INSTAGRAM_HANDLE, INSTAGRAM_URL, WHATSAPP_NUMBER, whatsappLink } from "@/lib/config";
import { canonicalUrl, PAGES, type PageKey } from "@/lib/seo";
import { SHOE_RENTAL_MAD } from "@/lib/shoes";
import { SWITCHOFF_CAPACITY, SWITCHOFF_PRICE_MAD, SWITCHOFF_TIME, SWITCHOFF_WEEKDAYS } from "@/lib/switchoff";
import { DAY_NAMES, PRICE_PER_MONTH_MAD, PRICE_PER_SESSION_MAD, TRAINER_NAME, TRAINING_DAYS_LABEL, TRAINING_TIME } from "@/lib/training";

// /llms.txt (https://llmstxt.org): a plain-markdown summary of the site for AI
// assistants. Built at deploy time from the same config as the pages (titles,
// descriptions, prices, FAQ), so it stays in sync with the site.
export const dynamic = "force-static";

const hour = (t: string) => t.replace(/^0/, "").replace(":00", "h").replace(":", "h");
const days = (list: readonly number[]) =>
  list.map((d) => DAY_NAMES[d].toLowerCase()).join(", ").replace(/, ([^,]*)$/, " et $1");
const page = (key: PageKey, name: string) => `- [${name}](${canonicalUrl(PAGES[key].path)}): ${PAGES[key].description}`;
const phone = `+${WHATSAPP_NUMBER.slice(0, 3)} ${WHATSAPP_NUMBER.slice(3, 6)} ${WHATSAPP_NUMBER.slice(6, 9)} ${WHATSAPP_NUMBER.slice(9)}`;

function llmsTxt(): string {
  const jerseyPrice = Math.min(...products.map((p) => p.priceMad));
  const sizes = [...new Set(products.flatMap((p) => p.sizes))];
  return [
    `# ${BRAND_NAME}`,
    "",
    `> ${BRAND_NAME} organise des matchs de foot 5v5, 7v7 et 9v9 à Marrakech (Maroc). On réserve sa place seul ou entre amis ; ${BRAND_NAME} s'occupe du terrain, du ballon et des équipes. Aussi : training physique en groupe, Switch Off (sport le week-end), activités foot pour les enfants de 5 à 14 ans et maillots de clubs.`,
    "",
    "Site en français. Réservation en ligne (compte gratuit) ou sur WhatsApp, paiement sur place. Les dates, terrains et prix des matchs changent souvent : la page Jouer fait foi.",
    "",
    "## Services",
    "",
    page("jouer", "Matchs de foot à Marrakech"),
    page("training", "Training physique"),
    page("switchOff", "Switch Off (week-end)"),
    page("kids", "Foot pour enfants (5–14 ans)"),
    page("merch", "Maillots de foot"),
    page("classement", "Classement et tirage du mois"),
    "",
    "## Prix et réservation",
    "",
    `- [Matchs](${canonicalUrl(PAGES.jouer.path)}): prix affiché sur chaque match, en MAD par joueur. Paiement sur place (espèces) ou par virement avant le match. Annulation gratuite jusqu'à 24 h avant. Location de chaussures : ${SHOE_RENTAL_MAD} MAD.`,
    `- [Training physique](${canonicalUrl(PAGES.training.path)}): ${PRICE_PER_SESSION_MAD} MAD la séance ou ${PRICE_PER_MONTH_MAD} MAD par mois, le ${TRAINING_DAYS_LABEL.toLowerCase()} à ${hour(TRAINING_TIME)}, avec le coach ${TRAINER_NAME}.`,
    `- [Switch Off](${canonicalUrl(PAGES.switchOff.path)}): ${SWITCHOFF_PRICE_MAD} MAD la séance, ${SWITCHOFF_CAPACITY} places, le ${days(SWITCHOFF_WEEKDAYS)} à ${hour(SWITCHOFF_TIME)}.`,
    `- [Foot pour enfants](${canonicalUrl(PAGES.kids.path)}): réservation sur WhatsApp ; dates, terrain et prix communiqués à la réservation.`,
    `- [Maillots](${canonicalUrl(PAGES.merch.path)}): ${jerseyPrice} MAD, tailles ${sizes[0]} à ${sizes.at(-1)}, commande sur WhatsApp, paiement à la livraison à Marrakech.`,
    "",
    "## Contact",
    "",
    `- [WhatsApp](${whatsappLink()}): ${phone}, pour réserver ou poser une question.`,
    `- [Instagram](${INSTAGRAM_URL}): @${INSTAGRAM_HANDLE}, annonces des matchs et des activités.`,
    "",
    "## FAQ",
    "",
    ...FAQ.map((f) => `- [${f.q}](${canonicalUrl("/")}#faq): ${f.a}`),
    "",
    "## Politiques",
    "",
    page("confidentialite", "Confidentialité"),
    "",
    "## Optional",
    "",
    `- [Plan du site](${canonicalUrl("/sitemap.xml")}): toutes les pages publiques.`,
    `- [Classement](${canonicalUrl(PAGES.classement.path)}): meilleurs joueurs du mois et de la saison.`,
    "",
  ].join("\n");
}

export function GET() {
  return new Response(llmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
