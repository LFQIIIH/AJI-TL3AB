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

// Catalogue: genuine club jerseys bought from suppliers and resold by AJI TL3AB.
// Images are 800×800 WebP in /public/merch (resize big photos before adding).
export const products: Product[] = [
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
    id: "maillot-liverpool-domicile-manches-longues",
    name: "Maillot Liverpool Domicile Manches Longues",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-liverpool-domicile-manches-longues.webp"],
    preorder: false,
    description: "Rouge à motifs graphiques blancs, manches longues. En stock.",
  },
  {
    id: "maillot-manchester-united-domicile",
    name: "Maillot Manchester United Domicile",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-manchester-united-domicile.webp"],
    preorder: false,
    description: "Rouge, épaules noires. En stock.",
  },
  {
    id: "maillot-manchester-united-bleu",
    name: "Maillot Manchester United Bleu",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-manchester-united-bleu.webp"],
    preorder: false,
    description: "Bleu roi, col et manches rouge et blanc. En stock.",
  },
  {
    id: "maillot-real-madrid-domicile",
    name: "Maillot Real Madrid Domicile",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-real-madrid-domicile.webp"],
    preorder: false,
    description: "Blanc, finitions vertes et roses. En stock.",
  },
  {
    id: "maillot-real-madrid-vert",
    name: "Maillot Real Madrid Vert",
    priceMad: 199,
    sizes: ["S", "M", "L", "XL"],
    images: ["/merch/maillot-real-madrid-vert.webp"],
    preorder: false,
    description: "Vert foncé à motifs ton sur ton. En stock.",
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
];
