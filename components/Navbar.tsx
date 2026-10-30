"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSessionUser } from "@/lib/supabase/useSession";
import { firstName } from "@/lib/profile";

const LINKS = [
  { href: "/jouer", label: "Jouer" },
  { href: "/classement", label: "Ranking" },
  { href: "/prepa-physique", label: "Training" },
  { href: "/kids", label: "Enfants" },
  { href: "/merch", label: "L7wayej" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = useSessionUser();
  const account = isSupabaseConfigured
    ? user
      ? { href: "/compte", label: firstName((user.user_metadata?.full_name as string | undefined) ?? "") || "Mon compte" }
      : user === null
        ? { href: "/connexion", label: "Connexion" }
        : null
    : null;

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-forest-light bg-forest text-white">
      <nav className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="headline flex items-center gap-2 text-2xl" aria-label="AJI TL3AB, accueil">
          <Image src="/logo-mark.png" alt="" width={379} height={279} priority className="h-10 w-auto" />
          <span>
            Aji <span className="text-highlight">tl3ab</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`text-sm font-semibold uppercase tracking-wide transition hover:text-highlight ${
                  pathname === l.href ? "text-highlight" : "text-white"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
          {account && (
            <li>
              <Link
                href={account.href}
                className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wide transition hover:text-highlight ${
                  pathname === account.href ? "text-highlight" : "text-white"
                }`}
              >
                <UserIcon />
                {account.label}
              </Link>
            </li>
          )}
          <li>
            <Link href="/jouer" className="btn-primary px-5 py-2.5">
              Réserve
            </Link>
          </li>
        </ul>

        <button
          type="button"
          className="-mr-2 p-2 md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-forest-light md:hidden">
          <ul className="container-page flex flex-col py-4">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`headline block py-3 text-4xl ${pathname === l.href ? "text-highlight" : ""}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {account && (
              <li className="mt-2 border-t border-forest-light pt-4">
                <Link
                  href={account.href}
                  className={`flex items-center gap-3 py-2 text-lg font-semibold ${pathname === account.href ? "text-highlight" : ""}`}
                >
                  <UserIcon />
                  {account.label}
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}

function UserIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
