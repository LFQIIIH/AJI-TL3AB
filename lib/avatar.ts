import { SUPABASE_URL } from "@/lib/supabase/config";

export const AVATARS_BUCKET = "avatars";
export const AVATAR_SIDE = 400;

/** Public URL of a profile photo ("<user id>/<file>.jpg"), or null. */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${AVATARS_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** A stored photo path must be inside the player's own folder. */
export const isOwnAvatarPath = (path: string, userId: string) =>
  path.startsWith(`${userId}/`) && /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,80}$/.test(path);

/**
 * Centre square crop, resized to 400×400 JPEG, in the browser (phone photos
 * are several MB). Throws if the browser can't read the image (e.g. HEIC on Chrome).
 */
export async function squareAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(AVATAR_SIDE, side);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no_canvas");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("no_blob");
  return blob;
}
