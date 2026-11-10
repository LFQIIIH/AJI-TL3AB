import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Public, indexable pages only (account, login and referral pages are noindex).
const PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/jouer", changeFrequency: "daily", priority: 0.9 },
  { path: "/merch", changeFrequency: "weekly", priority: 0.8 },
  { path: "/switch-off", changeFrequency: "weekly", priority: 0.8 },
  { path: "/prepa-physique", changeFrequency: "weekly", priority: 0.8 },
  { path: "/kids", changeFrequency: "monthly", priority: 0.7 },
  { path: "/classement", changeFrequency: "daily", priority: 0.5 },
  { path: "/confidentialite", changeFrequency: "yearly", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
