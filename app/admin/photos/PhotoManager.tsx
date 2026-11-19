"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase/lazy";
import { SITE_PHOTOS_BUCKET, sitePhotoUrl } from "@/lib/site-photos";
import { refreshHomePhotos } from "./actions";

const MAX_SIDE = 1600;

/** Phone photos are 3–10 MB: shrink to 1600 px JPEG before upload (falls back to the original). */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

export default function PhotoManager() {
  const [photos, setPhotos] = useState<{ name: string }[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const client = await supabaseClient();
    const { data } = await client.rpc("site_photos", { p_limit: 24 });
    setPhotos((data ?? []) as { name: string }[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(fileList: FileList | null) {
    // Copy first: clearing the input below empties the live FileList.
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    setBusy(true);
    const client = await supabaseClient();
    const failed: string[] = [];
    let i = 0;
    for (const file of files) {
      setStatus(`Envoi ${++i}/${files.length}…`);
      if (!file.type.startsWith("image/")) {
        failed.push(`${file.name} (pas une image)`);
        continue;
      }
      const blob = await shrink(file);
      const type = blob.type || file.type;
      const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
      const { error } = await client.storage.from(SITE_PHOTOS_BUCKET).upload(`${crypto.randomUUID()}.${ext}`, blob, { contentType: type });
      if (error) failed.push(file.name);
    }
    if (input.current) input.current.value = "";
    await refreshHomePhotos();
    const ok = files.length - failed.length;
    setStatus(
      failed.length
        ? `${ok} ajoutée${ok > 1 ? "s" : ""}. Non envoyé : ${failed.join(", ")}`
        : `${ok} photo${ok > 1 ? "s" : ""} ajoutée${ok > 1 ? "s" : ""}.`,
    );
    setBusy(false);
    load();
  }

  async function remove(name: string) {
    setBusy(true);
    const { error } = await (await supabaseClient()).storage.from(SITE_PHOTOS_BUCKET).remove([name]);
    await refreshHomePhotos();
    setStatus(error ? "Suppression impossible." : "Photo supprimée.");
    setBusy(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className={`btn-primary cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
          + Ajouter des photos
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
        </label>
        <span className="text-xs text-ink-muted">JPG, PNG ou WebP · réduites automatiquement avant l&apos;envoi</span>
      </div>
      {status && (
        <p role="status" className="text-sm font-semibold">
          {status}
        </p>
      )}
      {photos === null ? (
        <p className="text-ink-muted">Chargement…</p>
      ) : photos.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.name} className="overflow-hidden rounded-2xl border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview, original file */}
              <img src={sitePhotoUrl(p.name)} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
              <div className="flex items-center justify-between gap-2 p-2 text-xs">
                <span className={i < 8 ? "font-semibold text-primary" : "text-ink-muted"}>{i < 8 ? "Sur l'accueil" : "Masquée (plus ancienne)"}</span>
                <button type="button" disabled={busy} onClick={() => remove(p.name)} className="inline-flex min-h-11 items-center px-2 font-semibold text-red-700 hover:underline">
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-6 text-ink-muted">Aucune photo pour l&apos;instant : la section photos est cachée sur l&apos;accueil.</p>
      )}
    </div>
  );
}
