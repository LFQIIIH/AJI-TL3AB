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

// Catalogue. Team jerseys are drawn by scripts/generate_jerseys.py (one per team
// in lib/teams.ts); other images are SVG mockups in /public/merch.
export const products: Product[] = [
  {
    id: "maillot-vikings",
    name: "Maillot Vikings",
    priceMad: 249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-vikings.svg"],
    preorder: true,
    description: "Rayures bleu nuit et bleu glacier, emblème casque viking.",
  },
  {
    id: "maillot-conquerants",
    name: "Maillot Conquérants",
    priceMad: 249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-conquerants.svg"],
    preorder: true,
    description: "Bordeaux avec écharpe dorée en diagonale, emblème épées croisées.",
  },
  {
    id: "maillot-fighters",
    name: "Maillot Fighters",
    priceMad: 249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-fighters.svg"],
    preorder: true,
    description: "Noir à fines rayures lime, emblème bouclier.",
  },
  {
    id: "maillot-lions",
    name: "Maillot Lions de l'Atlas",
    priceMad: 249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-lions.svg"],
    preorder: true,
    description: "Moitié rouge, moitié vert, liseré doré, emblème patte de lion.",
  },
  {
    id: "maillot-requins",
    name: "Maillot Requins",
    priceMad: 249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-requins.svg"],
    preorder: true,
    description: "Cerclé bleu marine et turquoise, emblème aileron.",
  },
  {
    id: "maillot-dragons",
    name: "Maillot Dragons",
    priceMad: 249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-dragons.svg"],
    preorder: true,
    description: "Noir avec chevrons orange, emblème flamme.",
  },
  {
    id: "maillot-eclairs",
    name: "Maillot Éclairs",
    priceMad: 249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-eclairs.svg"],
    preorder: true,
    description: "Rayures violettes et jaunes, emblème éclair.",
  },
  {
    id: "maillot-titans",
    name: "Maillot Titans",
    priceMad: 249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["/merch/maillot-titans.svg"],
    preorder: true,
    description: "Dégradé gris acier, emblème marteau.",
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
