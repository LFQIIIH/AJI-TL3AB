import Link from "next/link";
import { CITY, INSTAGRAM_HANDLE, INSTAGRAM_URL, whatsappLink } from "@/lib/config";
import { InstagramIcon, WhatsAppIcon } from "@/components/Icons";

export default function Footer() {
  return (
    <footer className="border-t border-night-700 bg-night-900">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          <p className="headline text-4xl">
            Aji <span className="text-accent">tl3ab</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-chalk-muted">
            Des matchs de foot organisés à {CITY}. Tu ramènes tes crampons, on s&apos;occupe du reste.
          </p>
        </div>

        <nav aria-label="Pages">
          <p className="eyebrow">Navigation</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/jouer" className="hover:text-accent">Jouer</Link></li>
            <li><Link href="/kids" className="hover:text-accent">Kids Academy</Link></li>
            <li><Link href="/merch" className="hover:text-accent">Merch</Link></li>
          </ul>
        </nav>

        <div>
          <p className="eyebrow">Contact</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={whatsappLink("Salam AJI TL3AB !")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-accent">
                <WhatsAppIcon /> WhatsApp
              </a>
            </li>
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-accent">
                <InstagramIcon /> @{INSTAGRAM_HANDLE}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-night-700">
        <p className="container-page py-5 text-xs text-chalk-muted">
          © {new Date().getFullYear()} AJI TL3AB · {CITY} · Yallah, chouf-nak f terrain.
        </p>
      </div>
    </footer>
  );
}
