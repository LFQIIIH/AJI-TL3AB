import type { MetadataRoute } from "next";

/** Lets players add AJI TL3AB to their home screen (needed for notifications on iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AJI TL3AB · Matchs de foot à Marrakech",
    short_name: "AJI TL3AB",
    description: "Réserve tes matchs de foot à Marrakech, suis tes stats, ton niveau et le classement.",
    start_url: "/jouer?source=app",
    scope: "/",
    display: "standalone",
    background_color: "#F5F7F2",
    theme_color: "#12372A",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
