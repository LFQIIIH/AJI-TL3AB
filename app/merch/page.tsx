import type { Metadata } from "next";
import { products } from "@/data/products";
import ProductCard from "./ProductCard";

export const metadata: Metadata = {
  title: "Merch",
  description: "Maillots, t-shirts, hoodies et casquettes AJI TL3AB. Commande directe via WhatsApp.",
};

export default function MerchPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Boutique</p>
      <h1 className="headline mt-3 text-6xl sm:text-8xl">
        Lbes <span className="text-primary">l&apos;couleurs</span>
      </h1>
      <p className="mt-4 max-w-xl text-ink-muted">
        Choisis ta taille et commande sur WhatsApp. Paiement à la livraison sur Marrakech, ou retrait au prochain match.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
