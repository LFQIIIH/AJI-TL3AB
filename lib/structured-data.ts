import type { Match } from "@/data/matches";
import type { Product } from "@/data/products";
import { BRAND_NAME, INSTAGRAM_HANDLE, WHATSAPP_NUMBER } from "@/lib/config";
import { isFull, matchStart } from "@/lib/matches";
import { absoluteUrl } from "@/lib/seo";
import { sessionPlace, type TrainingSession } from "@/lib/training";

const ORG_ID = absoluteUrl("/#organization");

const organizer = { "@type": "Organization", "@id": ORG_ID, name: BRAND_NAME, url: absoluteUrl("/") };

function place(name: string, area = "") {
  return {
    "@type": "Place",
    name: [name, area].filter(Boolean).join(", ") || "Marrakech",
    address: { "@type": "PostalAddress", addressLocality: "Marrakech", addressCountry: "MA" },
  };
}

/** Local business + website, for the home page. */
export function businessJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      "@id": ORG_ID,
      name: BRAND_NAME,
      description: "Matchs de foot 5v5, 7v7 et 9v9 à Marrakech, training physique, Switch Off le week-end, activités enfants et maillots.",
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icon.png"),
      image: absoluteUrl("/og-image.png"),
      telephone: `+${WHATSAPP_NUMBER}`,
      address: { "@type": "PostalAddress", addressLocality: "Marrakech", addressCountry: "MA" },
      areaServed: { "@type": "City", name: "Marrakech" },
      sameAs: [`https://www.instagram.com/${INSTAGRAM_HANDLE}/`],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: BRAND_NAME,
      url: absoluteUrl("/"),
      inLanguage: "fr",
      publisher: { "@id": ORG_ID },
    },
  ];
}

export function faqJsonLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function productsJsonLd(products: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        ...(p.description ? { description: p.description } : {}),
        image: p.images.map((src) => absoluteUrl(src)),
        sku: p.id,
        offers: {
          "@type": "Offer",
          url: absoluteUrl(`/merch#${p.id}`),
          price: p.priceMad,
          priceCurrency: "MAD",
          availability: p.preorder ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@id": ORG_ID },
        },
      },
    })),
  };
}

export function matchesJsonLd(matches: Match[]) {
  return matches.map((m) => ({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `Match de foot ${m.format} · ${m.pitch}`,
    description: `Match ${m.format} (${m.level}) à ${m.pitch}, Marrakech. Viens seul ou entre amis, on fait les équipes.`,
    sport: "Football",
    startDate: matchStart(m).toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: place(m.pitch, m.area),
    image: absoluteUrl("/og-image.png"),
    organizer,
    offers: {
      "@type": "Offer",
      url: absoluteUrl("/jouer"),
      price: m.priceMad,
      priceCurrency: "MAD",
      availability: isFull(m) ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    },
  }));
}

export function sessionsJsonLd(sessions: TrainingSession[], { name, description, priceMad, path }: { name: string; description: string; priceMad: number; path: string }) {
  return sessions.map((s) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    startDate: new Date(s.start).toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: place(sessionPlace(s)),
    image: absoluteUrl("/og-image.png"),
    organizer,
    offers: { "@type": "Offer", url: absoluteUrl(path), price: priceMad, priceCurrency: "MAD", availability: "https://schema.org/InStock" },
  }));
}
