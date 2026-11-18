"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSessionUser } from "@/lib/supabase/useSession";

/** For visitors without an account: what they get by signing up. */
export default function JoinBanner({ className = "" }: { className?: string }) {
  const user = useSessionUser();
  // Shown while the session loads (no layout jump for visitors); hidden once signed in.
  if (!isSupabaseConfigured || user) return null;
  return (
    <div className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-2xl bg-forest p-4 text-white sm:grid-cols-[auto_minmax(0,1fr)_auto] ${className}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-light text-highlight">
        <Zap className="h-6 w-6" aria-hidden="true" />
      </span>
      <span>
        <span className="block font-bold">Crée ton compte AJI TL3AB</span>
        <span className="block text-sm text-white/75">
          Réserve en un clic, gagne des points à chaque match, monte de niveau et entre dans le classement.
        </span>
      </span>
      <Link href="/connexion" className="btn col-span-2 bg-highlight text-highlight-ink hover:brightness-95 sm:col-span-1">
        C&apos;est parti
      </Link>
    </div>
  );
}
