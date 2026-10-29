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

// Placeholder catalogue — images are SVG mockups in /public/merch.
export const products: Product[] = [
  {
    id: "maillot-domicile",
    name: "Maillot Domicile 26/27",
    priceMad: 249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-domicile-1.svg", "/merch/maillot-domicile-2.svg"],
    preorder: true,
    description: "Le maillot officiel, tissu respirant. Livraison prévue mi-décembre.",
  },
  {
    id: "maillot-exterieur",
    name: "Maillot Extérieur 26/27",
    priceMad: 249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-exterieur-1.svg", "/merch/maillot-exterieur-2.svg"],
    preorder: true,
    description: "Blanc et lime, pour les matchs à l'extérieur. Livraison prévue mi-décembre.",
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
