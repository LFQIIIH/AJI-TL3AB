"use client";

/**
 * Shares a story image (our /api/carte/… routes) through the phone's share
 * sheet (Instagram, WhatsApp…). Falls back to opening the image, so it can be
 * saved, when files can't be shared (most computers).
 * Returns false if the image couldn't be made.
 */
export async function shareCard(url: string, fileName: string, title: string): Promise<boolean> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return false;
  const blob = await res.blob();
  const file = new File([blob], fileName, { type: blob.type || "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
    } catch {
      // Closed the share sheet: nothing to do.
    }
    return true;
  }
  window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
  return true;
}
