"use client";

import Link from "next/link";
import { useEffect } from "react";
import { storeReferral } from "@/lib/community";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Saves the friend's code; it's sent with the profile when they sign up. */
export default function ReferralLanding({ code }: { code: string }) {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  useEffect(() => {
    if (clean) storeReferral(clean);
  }, [clean]);

  return (
    <div className="container-page flex justify-center py-16 sm:py-24">
      <div className="card w-full max-w-md p-6 text-center sm:p-8">
        <p className="eyebrow">Invitation</p>
        <h1 className="headline mt-3 text-5xl">Un pote t&apos;invite</h1>
        <p className="mt-4 text-ink-muted">
          Rejoins les matchs AJI TL3AB à Marrakech : 5v5, 7v7 et 9v9, seul ou avec tes potes. Crée ton compte en 30 secondes.
        </p>
        <p className="mt-4 text-sm">
          Code de ton pote : <strong className="font-mono">{clean}</strong>
        </p>
        <div className="mt-8 flex flex-col gap-3">
          {isSupabaseConfigured && (
            <Link href="/connexion" className="btn-primary">
              Créer mon compte
            </Link>
          )}
          <Link href="/jouer" className="btn-ghost">
            Voir les matchs
          </Link>
        </div>
      </div>
    </div>
  );
}
