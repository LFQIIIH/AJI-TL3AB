"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Share } from "lucide-react";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push";

/** Turn match notifications on / off on this phone (and how to install the app on iPhone). */
export default function NotificationsCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    pushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  if (state === null) return null;

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch {
      setError("Activation impossible pour l'instant. Réessaie dans un moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="notifs">
      <div className="flex items-start gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${state === "on" ? "bg-highlight text-highlight-ink" : "bg-canvas-deep text-ink-muted"}`}>
          {state === "on" ? <Bell className="h-6 w-6" aria-hidden="true" /> : <BellOff className="h-6 w-6" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="notifs" className="headline text-3xl">
            Notifications
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Nouveaux matchs publiés, ta carte du match, l&apos;ouverture des votes et ta série de la semaine. Jamais de pub.
          </p>

          {state === "ios-install" && (
            <div className="mt-4 rounded-xl bg-canvas-deep p-4 text-sm">
              <p className="font-semibold">Sur iPhone, ajoute d&apos;abord AJI TL3AB à ton écran d&apos;accueil :</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-muted">
                <li>
                  Dans Safari, touche <Share className="inline h-4 w-4 align-[-3px]" aria-label="Partager" />
                </li>
                <li>« Sur l&apos;écran d&apos;accueil », puis « Ajouter »</li>
                <li>Ouvre AJI TL3AB depuis l&apos;icône et reviens ici</li>
              </ol>
            </div>
          )}
          {state === "unsupported" && <p className="mt-3 text-sm text-ink-muted">Ce navigateur ne gère pas les notifications. Essaie avec Chrome ou Safari à jour.</p>}
          {state === "denied" && (
            <p className="mt-3 text-sm text-ink-muted">
              Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du navigateur (cadenas à côté de l&apos;adresse), puis recharge la page.
            </p>
          )}
          {(state === "on" || state === "off") && (
            <button type="button" onClick={toggle} disabled={busy} className={state === "on" ? "btn-ghost mt-4" : "btn-primary mt-4"}>
              {busy ? "…" : state === "on" ? "Désactiver sur ce téléphone" : "Activer les notifications"}
            </button>
          )}
          {state === "on" && <p className="mt-2 text-xs font-semibold text-primary">Activées sur ce téléphone.</p>}
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
