"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, House, Trophy, User } from "lucide-react";
import { BallIcon } from "@/components/Icons";

type Tab = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; match: (p: string) => boolean };

const TABS: Tab[] = [
  { href: "/", label: "Accueil", icon: House, match: (p) => p === "/" },
  { href: "/jouer/historique", label: "Résultats", icon: History, match: (p) => p.startsWith("/jouer/historique") || p.startsWith("/match/") },
  { href: "/classement", label: "Classement", icon: Trophy, match: (p) => p.startsWith("/classement") || p.startsWith("/joueur/") },
  { href: "/compte", label: "Compte", icon: User, match: (p) => p.startsWith("/compte") || p.startsWith("/connexion") },
];

/**
 * Phone / tablet navigation fixed at the bottom, "Jouer" in the middle.
 * Hidden on large screens (the top menu is enough) and in /admin.
 */
export default function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/admin")) return null;
  const playing = pathname === "/jouer";
  const tab = (t: Tab) => {
    const on = t.match(pathname);
    const Icon = t.icon;
    return (
      <li key={t.href}>
        <Link
          href={t.href}
          aria-current={on ? "page" : undefined}
          className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${on ? "text-primary" : "text-ink-muted hover:text-ink"}`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
          {t.label}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Keeps the end of the page clear of the fixed bar. */}
      <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] bg-forest lg:hidden" />
      <nav
        id="mobile-tabbar"
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-1">
          {TABS.slice(0, 2).map(tab)}
          <li>
            <Link
              href="/jouer"
              aria-current={playing ? "page" : undefined}
              className="-mt-6 flex flex-col items-center gap-0.5 text-[11px] font-bold text-ink"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface bg-highlight text-highlight-ink shadow-lg shadow-forest/30 transition active:scale-95 ${playing ? "ring-2 ring-primary" : ""}`}
              >
                <BallIcon className="h-7 w-7" />
              </span>
              Jouer
            </Link>
          </li>
          {TABS.slice(2).map(tab)}
        </ul>
      </nav>
    </>
  );
}
