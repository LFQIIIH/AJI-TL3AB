"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/jouer", label: "Jouer" },
  { href: "/kids", label: "Kids" },
  { href: "/merch", label: "Merch" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-night-700 bg-night/90 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="headline text-2xl">
          Aji <span className="text-accent">tl3ab</span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`text-sm font-semibold uppercase tracking-wide transition hover:text-accent ${
                  pathname === l.href ? "text-accent" : "text-chalk"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
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
        <div className="border-t border-night-700 md:hidden">
          <ul className="container-page flex flex-col py-4">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`headline block py-3 text-4xl ${pathname === l.href ? "text-accent" : ""}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
