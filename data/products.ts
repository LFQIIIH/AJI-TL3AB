export type Product = {
  id: string;
  name: string;
  priceMad: number;
  sizes: string[];
  /** Paths under /public. First image is the cover. */
  images: string[];
  preorder: boolean;
  description?: string;
};

// Catalogue. Club jerseys use the designer's photos; other images are SVG mockups
// in /public/merch.
export const products: Product[] = [
  // Club jerseys: genuine, bought from suppliers and resold by AJI TL3AB.
  // Images: 800×800 WebP in /public/merch (resize big photos before adding).
  {
    id: "maillot-barcelone-domicile",
    name: "Maillot FC Barcelone Domicile",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-barcelone-domicile.webp"],
    preorder: false,
    description: "Rayures blaugrana bleu et grenat. En stock.",
  },
  {
    id: "maillot-liverpool-domicile",
    name: "Maillot Liverpool Domicile",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-liverpool-domicile.webp"],
    preorder: false,
    description: "Rouge à motifs graphiques blancs. En stock.",
  },
  {
    id: "maillot-arsenal-bleu-marine",
    name: "Maillot Arsenal Bleu Marine",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-arsenal-bleu-marine.webp"],
    preorder: false,
    description: "Bleu marine, finitions rouges et jaunes. En stock.",
  },
  {
    id: "maillot-juventus-domicile",
    name: "Maillot Juventus Domicile",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-juventus-domicile.webp"],
    preorder: false,
    description: "Rayures noires et blanches, col polo. En stock.",
  },
  {
    id: "maillot-bayern-domicile",
    name: "Maillot Bayern Munich Domicile",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-bayern-domicile.webp"],
    preorder: false,
    description: "Rouge et blanc. En stock.",
  },
  {
    id: "maillot-inter-miami-noir",
    name: "Maillot Inter Miami Noir",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-inter-miami-noir.webp"],
    preorder: false,
    description: "Noir avec détails roses, col polo. En stock.",
  },
  {
    id: "tshirt-marrakech",
    name: "T-shirt Marrakech FC",
    priceMad: 149,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/tshirt-marrakech-1.svg"],
    preorder: false,
    description: "Coton épais 220g, coupe oversize.",
  },
  {
    id: "hoodie",
    name: "Hoodie AJI TL3AB",
    priceMad: 349,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/hoodie-1.svg"],
    preorder: false,
    description: "Molleton brossé, pour les soirées fraîches au bord du terrain.",
  },
  {
    id: "casquette",
    name: "Casquette AT",
    priceMad: 129,
    sizes: ["Taille unique"],
    images: ["/merch/casquette-1.svg"],
    preorder: false,
    description: "Brodée, réglable à l'arrière.",
  },
];
