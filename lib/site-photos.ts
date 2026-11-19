import { MATCHES_REVALIDATE_SECONDS } from "@/lib/config";
import { isSupabaseConfigured, SUPABASE_URL } from "@/lib/supabase/config";
import { publicRpc } from "@/lib/supabase/publicApi";

export const SITE_PHOTOS_BUCKET = "site-photos";
export const SITE_PHOTOS_TAG = "site-photos";

export type SitePhoto = { name: string; url: string };

export const sitePhotoUrl = (name: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${SITE_PHOTOS_BUCKET}/${name.split("/").map(encodeURIComponent).join("/")}`;

/** Newest photos added in /admin/photos (empty list if none or on error). */
export async function getSitePhotos(limit = 8): Promise<SitePhoto[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const rows = await publicRpc<{ name: string }>("site_photos", { p_limit: limit }, {
      next: { revalidate: MATCHES_REVALIDATE_SECONDS, tags: [SITE_PHOTOS_TAG] },
    });
    return rows.map((r) => ({ name: r.name, url: sitePhotoUrl(r.name) }));
  } catch {
    return [];
  }
}
