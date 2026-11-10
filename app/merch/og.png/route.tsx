import { products } from "@/data/products";
import { renderOgImage } from "@/lib/og-image";

// Built once at deploy time (the content only changes with the code).
export const dynamic = "force-static";

export function GET() {
  const price = Math.min(...products.map((p) => p.priceMad));
  return renderOgImage({
    eyebrow: "Maillots de foot · Marrakech",
    title: "Lbes *l'couleurs*",
    subtitle: `${products.length} maillots des grands clubs en stock, de S à XL. Paiement à la livraison.`,
    pills: [`${price} MAD`, "S à XL"],
    photo: products[0]?.images[0],
  });
}
