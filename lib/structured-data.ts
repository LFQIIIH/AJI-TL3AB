import type {
  BreadcrumbList,
  Event,
  FAQPage,
  GeoCoordinates,
  ItemList,
  OpeningHoursSpecification,
  Organization,
  Place,
  PostalAddress,
  SportsActivityLocation,
  SportsEvent,
  Thing,
  WebSite,
} from "schema-dts";
import type { Match } from "@/data/matches";
import { productDescription, type Product } from "@/data/products";
import { BRAND_NAME, INSTAGRAM_URL, WHATSAPP_NUMBER } from "@/lib/config";
import { isFull, matchStart } from "@/lib/matches";
import { absoluteUrl, breadcrumbTrail, canonicalUrl, PAGES, type PageKey } from "@/lib/seo";
import { sessionPlace, type TrainingSession } from "@/lib/training";

// schema.org (JSON-LD) builders. Types come from `schema-dts`, so a property
// that doesn't exist on a schema.org type fails the TypeScript build.
// Only content visible on the page is marked up.

/** A node of the page's @graph (no @context: <PageSeo> adds it once). */
export type SchemaNode = Thing;

// ── Business details ─────────────────────────────────────────────────────────
// Real data only. Anything `undefined` stays out of the markup until filled in.
const BUSINESS: {
  streetAddress?: string;
  postalCode?: string;
  geo?: GeoCoordinates;
  openingHours?: OpeningHoursSpecification[];
} = {
  streetAddress: undefined, // TODO: street address (as on the Google Business Profile), if there is a fixed one
  postalCode: undefined, // TODO: postal code, e.g. "40000"
  geo: undefined, // TODO: { "@type": "GeoCoordinates", latitude: 31.63, longitude: -8.0 } of the main pitch / meeting point
  openingHours: undefined, // TODO: e.g. [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", …], opens: "18:00", closes: "23:00" }]
};

const BUSINESS_ID = absoluteUrl("/#business");

const address: PostalAddress = {
  "@type": "PostalAddress",
  ...(BUSINESS.streetAddress ? { streetAddress: BUSINESS.streetAddress } : {}),
  ...(BUSINESS.postalCode ? { postalCode: BUSINESS.postalCode } : {}),
  addressLocality: "Marrakech",
  addressRegion: "Marrakech-Safi",
  addressCountry: "MA",
};

/** Who organises the matches and sessions (points to the business node on the home page). */
const organizer: Organization = { "@type": "Organization", "@id": BUSINESS_ID, name: BRAND_NAME, url: canonicalUrl("/") };

// ── Home ─────────────────────────────────────────────────────────────────────

/** The business. SportsActivityLocation = LocalBusiness subtype for sport activities. */
export function businessSchema(): SportsActivityLocation {
  return {
    "@type": "SportsActivityLocation",
    "@id": BUSINESS_ID,
    name: BRAND_NAME,
    description: PAGES.home.description,
    url: canonicalUrl("/"),
    logo: absoluteUrl("/logo-mark.png"),
    image: absoluteUrl("/og-image.png"),
    telephone: `+${WHATSAPP_NUMBER}`,
    address,
    ...(BUSINESS.geo ? { geo: BUSINESS.geo } : {}),
    ...(BUSINESS.openingHours ? { openingHoursSpecification: BUSINESS.openingHours } : {}),
    areaServed: { "@type": "City", name: "Marrakech" },
    sameAs: [INSTAGRAM_URL],
  };
}

export function websiteSchema(): WebSite {
  return {
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: BRAND_NAME,
    url: canonicalUrl("/"),
    inLanguage: "fr",
    publisher: { "@id": BUSINESS_ID },
  };
}

/** Only for a FAQ that is visible on the page. */
export function faqSchema(faq: { q: string; a: string }[]): FAQPage {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

// ── Inner pages ──────────────────────────────────────────────────────────────

export function breadcrumbSchema(key: PageKey): BreadcrumbList {
  return {
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbTrail(key).map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

/** Shop: the jerseys listed on /merch, each a Product with its Offer. */
export function productsSchema(products: Product[]): ItemList {
  return {
    "@type": "ItemList",
    name: "Maillots de foot",
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        "@id": absoluteUrl(`/merch#${p.id}`),
        name: p.name,
        description: productDescription(p),
        image: p.images.map((src) => absoluteUrl(src)),
        sku: p.id,
        url: absoluteUrl(`/merch#${p.id}`),
        offers: {
          "@type": "Offer",
          url: absoluteUrl(`/merch#${p.id}`),
          price: p.priceMad,
          priceCurrency: "MAD",
          availability: p.preorder ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@id": BUSINESS_ID },
        },
      },
    })),
  };
}

function place(name: string): Place {
  return { "@type": "Place", name, address };
}

/** /jouer: one SportsEvent per upcoming match listed on the page. */
export function matchesSchema(matches: Match[]): SportsEvent[] {
  return matches.map((m) => ({
    "@type": "SportsEvent",
    name: `Match de foot ${m.format} à ${m.pitch}`,
    description: `Match ${m.format} (${m.level}) à ${[m.pitch, m.area].filter(Boolean).join(", ")}, Marrakech. Viens seul ou entre amis, on fait les équipes.`,
    sport: "Football",
    startDate: matchStart(m).toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: place([m.pitch, m.area].filter(Boolean).join(", ")),
    image: absoluteUrl("/og-image.png"),
    organizer,
    offers: {
      "@type": "Offer",
      url: canonicalUrl(PAGES.jouer.path),
      price: m.priceMad,
      priceCurrency: "MAD",
      availability: isFull(m) ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    },
  }));
}

/** /prepa-physique and /switch-off: one Event per session listed on the page. */
export function sessionsSchema(
  sessions: TrainingSession[],
  { name, description, priceMad, page }: { name: string; description: string; priceMad: number; page: PageKey },
): Event[] {
  return sessions.map((s) => ({
    "@type": "Event",
    name,
    description,
    startDate: new Date(s.start).toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: place(sessionPlace(s)),
    image: absoluteUrl("/og-image.png"),
    organizer,
    offers: {
      "@type": "Offer",
      url: canonicalUrl(PAGES[page].path),
      price: priceMad,
      priceCurrency: "MAD",
      availability: "https://schema.org/InStock",
    },
  }));
}
