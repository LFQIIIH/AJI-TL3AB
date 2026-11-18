import type { Metadata } from "next";
import { Suspense } from "react";
import LoginPanel from "./LoginPanel";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi pour créer ton profil joueur AJI TL3AB.",
  robots: { index: false },
};

export default function ConnexionPage() {
  return (
    <div className="container-page flex justify-center py-16 sm:py-24">
      {/* Same size as the form, so the page doesn't jump when it appears. */}
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="card min-h-[57rem] w-full max-w-md p-6 min-[380px]:min-h-[54.5rem] sm:min-h-[52.5rem] sm:p-8"
          >
            <p className="eyebrow">Espace joueur</p>
          </div>
        }
      >
        <LoginPanel />
      </Suspense>
    </div>
  );
}
