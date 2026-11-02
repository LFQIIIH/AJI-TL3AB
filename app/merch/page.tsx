import type { Metadata } from "next";
import { products } from "@/data/products";
import InfoStrip from "@/components/InfoStrip";
import ProductCard from "./ProductCard";

export const metadata: Metadata = {
  title: "L7wayej",
  description: "Maillots des grands clubs en stock, de S à XL. Commande directe via WhatsApp, paiement à la livraison à Marrakech.",
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
      <InfoStrip
        className="mt-8"
        items={[
          { icon: "truck", label: "Livraison", value: "Partout à Marrakech" },
          { icon: "cash", label: "Paiement", value: "À la livraison" },
          { icon: "store", label: "Retrait", value: "Au prochain match" },
          { icon: "gift", label: "Maillots", value: "En stock, de S à XL" },
        ]}
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 3} />
        ))}
      </div>
    </div>
  );
}
