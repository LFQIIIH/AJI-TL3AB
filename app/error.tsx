"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

/** Shown instead of a blank page when a page crashes; the error goes to /admin/erreurs. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error.message || "Erreur de page", [error.digest && `digest ${error.digest}`, error.stack].filter(Boolean).join("\n"));
  }, [error]);

  return (
    <div className="container-page flex justify-center py-16 sm:py-24">
      <div className="card w-full max-w-md p-8 text-center">
        <p className="eyebrow">Oups</p>
        <h1 className="headline mt-3 text-5xl">Ça a raté</h1>
        <p className="mt-3 text-ink-muted">Cette page a eu un problème. On a été prévenus. Réessaie, ça marche souvent du premier coup.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Réessayer
          </button>
          <Link href="/" className="btn-ghost">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
