import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Brand colours and fonts shared by the share-card images (Instagram story 1080×1920). */
export const CARD = { forest: "#12372A", forestLight: "#1D4A3A", highlight: "#C7F36B", white: "#FFFFFF", muted: "#9DB5A8", red: "#F87171" };

const fontFile = (name: string) => readFile(join(process.cwd(), "assets/fonts", name));

export async function cardAssets() {
  const [anton, inter500, inter700, logo] = await Promise.all([
    fontFile("Anton-Regular.ttf"),
    fontFile("Inter-500.ttf"),
    fontFile("Inter-700.ttf"),
    readFile(join(process.cwd(), "assets/logo-mark.png")),
  ]);
  return {
    logoSrc: `data:image/png;base64,${logo.toString("base64")}`,
    fonts: [
      { name: "Anton", data: anton, weight: 400 as const, style: "normal" as const },
      { name: "Inter", data: inter500, weight: 500 as const, style: "normal" as const },
      { name: "Inter", data: inter700, weight: 700 as const, style: "normal" as const },
    ],
  };
}

export const cardBackground = {
  backgroundColor: CARD.forest,
  backgroundImage: `linear-gradient(to right, ${CARD.forestLight} 2px, transparent 2px), linear-gradient(to bottom, ${CARD.forestLight} 2px, transparent 2px)`,
  backgroundSize: "120px 120px",
};
