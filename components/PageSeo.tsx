import Link from "next/link";
import type { Graph } from "schema-dts";
import { breadcrumbTrail, PAGES, type PageKey } from "@/lib/seo";
import { breadcrumbSchema, type SchemaNode } from "@/lib/structured-data";

/**
 * Per-page SEO output, server-rendered:
 * - inner pages: the visible breadcrumb trail (Accueil › Page) + its BreadcrumbList,
 * - the page's own schema.org nodes (products, events, FAQ…),
 * all in one JSON-LD @graph. Place it at the top of the page content.
 * Titles, descriptions and canonicals come from the same PAGES config (lib/seo.ts).
 */
export default function PageSeo({ page, schema = [], className = "" }: { page: PageKey; schema?: SchemaNode[]; className?: string }) {
  const trail = breadcrumbTrail(page);
  const showTrail = "breadcrumb" in PAGES[page];
  const graph: Graph = {
    "@context": "https://schema.org",
    "@graph": [...(showTrail ? [breadcrumbSchema(page)] : []), ...schema],
  };

  return (
    <>
      {graph["@graph"].length > 0 && (
        <script
          type="application/ld+json"
          // "<" escaped so text from the sheet can't close the script tag
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
        />
      )}
      {showTrail && (
        <nav aria-label="Fil d'Ariane" className={`mb-4 text-sm text-ink-muted ${className}`}>
          <ol className="flex flex-wrap items-center gap-1.5">
            {trail.map((crumb, i) =>
              i < trail.length - 1 ? (
                <li key={crumb.url} className="flex items-center gap-1.5">
                  <Link href={new URL(crumb.url).pathname} className="hover:text-primary hover:underline">
                    {crumb.name}
                  </Link>
                  <span aria-hidden="true">›</span>
                </li>
              ) : (
                <li key={crumb.url} aria-current="page" className="font-semibold text-ink">
                  {crumb.name}
                </li>
              ),
            )}
          </ol>
        </nav>
      )}
    </>
  );
}
