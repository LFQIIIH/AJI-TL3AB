"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase/lazy";
import { publicRpc } from "@/lib/supabase/publicApi";
import { useSessionUser } from "@/lib/supabase/useSession";

const BUCKET = "match-media";
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm";
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

type Item = { path: string; url: string; video: boolean };

/**
 * Private photos / videos of a match. Only staff and the players who were
 * there can see them (Storage rules); `manage` adds upload and delete (staff).
 */
export default function MatchMedia({ matchId, count, manage = false }: { matchId: string; count?: number; manage?: boolean }) {
  const user = useSessionUser();
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState<Item | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const client = await supabaseClient();
    const { data } = await client.storage.from(BUCKET).list(matchId, { limit: 200, sortBy: { column: "created_at", order: "asc" } });
    const files = (data ?? []).filter((f) => f.id && f.name !== ".emptyFolderPlaceholder");
    if (!files.length) return setItems([]);
    const paths = files.map((f) => `${matchId}/${f.name}`);
    const { data: signed } = await client.storage.from(BUCKET).createSignedUrls(paths, 3600);
    const out: Item[] = [];
    (signed ?? []).forEach((sig, i) => {
      if (!sig.signedUrl) return;
      const mime = String(files[i]?.metadata?.mimetype ?? "");
      out.push({ path: paths[i], url: sig.signedUrl, video: mime.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(paths[i]) });
    });
    setItems(out);
  }, [matchId]);

  const [liveCount, setLiveCount] = useState<number | null>(null);

  useEffect(() => {
    if (user) load();
    // Signed out: the page is cached, so ask for the current count (cheap, no client library).
    else if (user === null && !manage)
      publicRpc<number>("match_media_count", { p_match_id: matchId })
        .then((n) => setLiveCount(Number(n) || 0))
        .catch(() => {});
  }, [user, load, manage, matchId]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const client = await supabaseClient();
    let done = 0;
    const failed: string[] = [];
    for (const file of Array.from(files)) {
      setStatus(`Envoi ${done + 1}/${files.length}…`);
      const ext = EXT[file.type];
      if (!ext) failed.push(`${file.name} (format non accepté)`);
      else if (file.size > MEDIA_MAX_BYTES) failed.push(`${file.name} (plus de 50 Mo)`);
      else {
        const { error } = await client.storage.from(BUCKET).upload(`${matchId}/${crypto.randomUUID()}.${ext}`, file, { contentType: file.type });
        if (error) failed.push(file.name);
      }
      done++;
    }
    setStatus(failed.length ? `Non envoyé : ${failed.join(", ")}` : `${files.length} fichier${files.length > 1 ? "s" : ""} ajouté${files.length > 1 ? "s" : ""}.`);
    if (input.current) input.current.value = "";
    setBusy(false);
    load();
  }

  async function remove(item: Item) {
    if (!confirm("Supprimer ce fichier ?")) return;
    const client = await supabaseClient();
    const { error } = await client.storage.from(BUCKET).remove([item.path]);
    setStatus(error ? "Suppression impossible." : "Fichier supprimé.");
    setOpen(null);
    load();
  }

  const total = items?.length ?? liveCount ?? count ?? 0;

  if (!manage && user === null) {
    return total > 0 ? (
      <p className="text-sm text-ink-muted">
        🔒 {total} photo{total > 1 ? "s" : ""} / vidéo{total > 1 ? "s" : ""} privée{total > 1 ? "s" : ""}, réservée{total > 1 ? "s" : ""} aux joueurs du match.{" "}
        <Link href="/connexion" className="font-semibold text-primary hover:underline">
          Connecte-toi
        </Link>{" "}
        pour les voir.
      </p>
    ) : (
      <p className="text-sm text-ink-muted">Pas encore de photos pour ce match.</p>
    );
  }

  return (
    <div>
      {manage && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className={`btn-primary cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
            + Ajouter photos / vidéos
            <input ref={input} type="file" accept={ACCEPT} multiple className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
          </label>
          <span className="text-xs text-ink-muted">50 Mo max par fichier · visibles seulement par les joueurs présents</span>
        </div>
      )}
      {status && (
        <p role="status" className="mb-3 text-sm font-semibold">
          {status}
        </p>
      )}
      {items === null ? (
        <p className="text-sm text-ink-muted">Chargement…</p>
      ) : items.length ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((it) => (
            <li key={it.path}>
              <button type="button" onClick={() => setOpen(it)} className="relative block aspect-square w-full overflow-hidden rounded-xl bg-canvas-deep">
                {it.video ? (
                  <>
                    <video src={`${it.url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center text-3xl text-white drop-shadow" aria-hidden="true">
                      ▶
                    </span>
                  </>
                ) : (
                  // Signed, short-lived URLs: next/image can't cache them, a plain img is right here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
                <span className="sr-only">{it.video ? "Ouvrir la vidéo" : "Ouvrir la photo"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : total > 0 && !manage ? (
        <p className="text-sm text-ink-muted">
          🔒 {total} photo{total > 1 ? "s" : ""} / vidéo{total > 1 ? "s" : ""} privée{total > 1 ? "s" : ""} : seuls les joueurs présents à ce match peuvent les voir.
        </p>
      ) : (
        <p className="text-sm text-ink-muted">Pas encore de photos pour ce match.</p>
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Média du match" className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4" onClick={() => setOpen(null)}>
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <a href={open.url} download className="btn-ghost bg-surface">
              Télécharger
            </a>
            {manage && (
              <button type="button" onClick={() => remove(open)} className="btn border border-red-300 bg-surface text-red-700">
                Supprimer
              </button>
            )}
            <button type="button" onClick={() => setOpen(null)} className="btn-ghost bg-surface">
              Fermer
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center pt-4" onClick={(e) => e.stopPropagation()}>
            {open.video ? (
              <video src={open.url} controls autoPlay playsInline className="max-h-full max-w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.url} alt="" className="max-h-full max-w-full object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
