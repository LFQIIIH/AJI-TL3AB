import { products } from "@/data/products";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "Maillots de foot des grands clubs à 199 MAD, livrés à Marrakech";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  const price = Math.min(...products.map((p) => p.priceMad));
  return renderOgImage({
    eyebrow: "Maillots de foot · Marrakech",
    title: "Lbes *l'couleurs*",
    subtitle: `${products.length} maillots des grands clubs en stock, de S à XL. Paiement à la livraison.`,
    pills: [`${price} MAD`, "S à XL"],
    photo: products[0]?.images[0],
  });
}
