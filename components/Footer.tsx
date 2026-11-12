import Image from "next/image";
import Link from "next/link";
import { CITY, INSTAGRAM_HANDLE, INSTAGRAM_URL, whatsappLink } from "@/lib/config";
import { InstagramIcon, WhatsAppIcon } from "@/components/Icons";

// Key pages with descriptive anchor text (the top menu keeps the short labels).
const FOOTER_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/jouer", label: "Matchs de foot à Marrakech" },
  { href: "/prepa-physique", label: "Training physique" },
  { href: "/switch-off", label: "Switch Off, le sport du week-end" },
  { href: "/kids", label: "Foot pour enfants" },
  { href: "/merch", label: "Maillots de foot" },
  { href: "/classement", label: "Classement et tirage du mois" },
  { href: "/regles", label: "Règlement" },
  { href: "/confidentialite", label: "Confidentialité" },
];

export default function Footer() {
  return (
    <footer className="bg-forest text-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          {/* Same source size as the menu logo, so both use one cached file (128px is sharp enough here). */}
          <Image src="/logo-mark.png" alt="" width={54} height={40} className="h-14 w-auto" />
          <p className="headline mt-3 text-4xl">
            Aji <span className="text-highlight">tl3ab</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-white/70">
            Des matchs de foot organisés à {CITY}. Tu ramènes tes crampons, on s&apos;occupe du reste.
          </p>
        </div>

        <nav aria-label="Pages">
          <p className="eyebrow text-highlight">Navigation</p>
          <ul className="mt-2 text-sm">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center hover:text-highlight">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="eyebrow text-highlight">Contact</p>
          <ul className="mt-2 text-sm">
            <li>
              <a href={whatsappLink("Salam AJI TL3AB !")} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 hover:text-highlight">
                <WhatsAppIcon /> WhatsApp
              </a>
            </li>
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 hover:text-highlight">
                <InstagramIcon /> @{INSTAGRAM_HANDLE}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-forest-light">
        <p className="container-page pb-24 pt-5 text-xs text-white/70 sm:pb-5">
          © {new Date().getFullYear()} AJI TL3AB · {CITY} · Yallah, chouf-nak f terrain.
        </p>
      </div>
    </footer>
  );
}
