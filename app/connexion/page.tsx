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
      <Suspense>
        <LoginPanel />
      </Suspense>
    </div>
  );
}
