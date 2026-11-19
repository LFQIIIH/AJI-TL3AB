"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

/** Last resort when the whole layout crashes (no header, no styles guaranteed). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error.message || "Erreur globale", [error.digest && `digest ${error.digest}`, error.stack].filter(Boolean).join("\n"));
  }, [error]);
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F5F7F2", color: "#17212B", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 16 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 28 }}>AJI TL3AB : ça a raté</h1>
          <p>Le site a eu un problème. On a été prévenus.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#187A4C", color: "#fff", fontWeight: 700 }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
