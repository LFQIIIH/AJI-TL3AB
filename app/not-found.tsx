import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="container-page flex justify-center py-20 sm:py-28">
      <div className="card w-full max-w-lg p-8 text-center sm:p-10">
        <p className="eyebrow">Erreur 404</p>
        <h1 className="headline mt-3 text-6xl">Hors-jeu !</h1>
        <p className="mt-4 text-ink-muted">Cette page n&apos;existe pas ou a été déplacée. Reviens sur le terrain :</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/jouer" className="btn-primary">
            Voir les matchs
          </Link>
          <Link href="/" className="btn-ghost">
            Accueil
          </Link>
        </div>
        <p className="mt-6 text-sm text-ink-muted">
          Aussi : <Link href="/switch-off" className="font-semibold text-primary hover:underline">Switch Off</Link> ·{" "}
          <Link href="/prepa-physique" className="font-semibold text-primary hover:underline">Training</Link> ·{" "}
          <Link href="/merch" className="font-semibold text-primary hover:underline">Maillots</Link>
        </p>
      </div>
    </div>
  );
}
