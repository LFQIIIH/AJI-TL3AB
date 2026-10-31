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
  // Club jerseys (genuine, bought from suppliers). Photo by the AJI TL3AB designer.
  // TODO: confirm price, sizes, stock and season.
  {
    id: "maillot-barcelone-domicile",
    name: "Maillot FC Barcelone Domicile",
    priceMad: 450,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-barcelone-domicile.jpg"],
    preorder: false,
    description: "Le maillot domicile du Barça, rayures blaugrana. Disponible en boutique.",
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
