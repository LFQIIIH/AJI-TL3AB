/* eslint-disable @next/next/no-img-element -- the share-image renderer (Satori) takes plain <img>, not next/image */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Shared template for the share images (Open Graph / X cards, 1200×630) that
// each page exports from its opengraph-image.tsx. Brand colours, Anton + Inter.

export const OG_SIZE = { width: 1200, height: 630 };

const SHORT_DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
/** [2, 4, 6] + "19:00" → "Mar · Jeu · Sam 19h" */
export const scheduleLabel = (weekdays: readonly number[], time: string) =>
  `${weekdays.map((d) => SHORT_DAYS[d]).join(" · ")} ${time.replace(/^0/, "").replace(":00", "h").replace(":", "h")}`;
export const OG_CONTENT_TYPE = "image/png";

const C = { forest: "#12372A", forestLight: "#1D4A3A", highlight: "#C7F36B", white: "#FFFFFF", muted: "#B9CCC1" };

const asset = (...p: string[]) => readFile(join(process.cwd(), ...p));

/** A /public photo as a PNG data URL (the image renderer doesn't read WebP). Null if it can't be converted. */
async function photoDataUrl(publicPath: string): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const png = await sharp(join(process.cwd(), "public", publicPath)).resize(440, 440, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export type OgImageContent = {
  /** Small line above the title, e.g. "Football · Marrakech". */
  eyebrow: string;
  /** Big title. Wrap a word in *stars* to colour it lime. */
  title: string;
  subtitle: string;
  /** Short facts shown as pills (price, schedule…). */
  pills?: string[];
  /** Optional photo from /public shown on the right (e.g. a jersey). */
  photo?: string;
};

export async function renderOgImage({ eyebrow, title, subtitle, pills = [], photo }: OgImageContent) {
  const [anton, inter500, inter700, logo, photoSrc] = await Promise.all([
    asset("assets/fonts", "Anton-Regular.ttf"),
    asset("assets/fonts", "Inter-500.ttf"),
    asset("assets/fonts", "Inter-700.ttf"),
    asset("assets", "logo-mark.png"),
    photo ? photoDataUrl(photo) : Promise.resolve(null),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  // One span per word (wrapped lines never start with a space); *word* = lime.
  const titleWords = title.split(/\s+/).filter(Boolean).map((w) => ({ text: w.replace(/\*/g, ""), lime: w.includes("*") }));
  const titleSize = photoSrc ? 92 : 108;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: C.forest,
          backgroundImage: `linear-gradient(to right, ${C.forestLight} 2px, transparent 2px), linear-gradient(to bottom, ${C.forestLight} 2px, transparent 2px)`,
          backgroundSize: "70px 70px",
          padding: "56px 64px",
          color: C.white,
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={logoSrc} width={81} height={60} alt="" style={{ marginRight: 18 }} />
            <span style={{ fontFamily: "Anton", fontSize: 40, letterSpacing: 1 }}>
              AJI <span style={{ color: C.highlight, marginLeft: 12 }}>TL3AB</span>
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: C.highlight, fontSize: 24, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>{eyebrow}</span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontFamily: "Anton",
                fontSize: titleSize,
                lineHeight: 1,
                textTransform: "uppercase",
                marginTop: 14,
                maxWidth: photoSrc ? 640 : 1000,
              }}
            >
              {titleWords.map((w, i) => (
                <span key={i} style={{ color: w.lime ? C.highlight : C.white, marginRight: Math.round(titleSize * 0.22) }}>
                  {w.text}
                </span>
              ))}
            </div>
            <span style={{ fontSize: 30, color: C.muted, marginTop: 20, maxWidth: photoSrc ? 640 : 960, lineHeight: 1.3 }}>{subtitle}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex" }}>
              {pills.slice(0, 4).map((pill) => (
                <span
                  key={pill}
                  style={{
                    backgroundColor: C.highlight,
                    color: C.forest,
                    fontSize: 24,
                    fontWeight: 700,
                    padding: "10px 22px",
                    borderRadius: 999,
                    marginRight: 12,
                  }}
                >
                  {pill}
                </span>
              ))}
            </div>
            {!photoSrc && <span style={{ fontSize: 24, color: C.muted }}>ajitl3ab.com</span>}
          </div>
        </div>

        {photoSrc && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", marginLeft: 40 }}>
            <img src={photoSrc} width={400} height={400} alt="" style={{ borderRadius: 28, border: `6px solid ${C.highlight}` }} />
            <span style={{ fontSize: 24, color: C.muted, marginTop: 20 }}>ajitl3ab.com</span>
          </div>
        )}
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Anton", data: anton, weight: 400, style: "normal" },
        { name: "Inter", data: inter500, weight: 500, style: "normal" },
        { name: "Inter", data: inter700, weight: 700, style: "normal" },
      ],
    },
  );
}
