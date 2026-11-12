import Link from "next/link";
import { Icon } from "@/components/Icons";

const TABS = [
  { href: "/jouer", label: "Matchs", icon: "calendar" },
  { href: "/jouer/historique", label: "Historique", icon: "clock" },
  { href: "/classement", label: "Classement", icon: "level" },
] as const;

/** Matchs · Historique · Classement — real links (crawlable), current tab highlighted. */
export default function JouerTabs({ current, className = "" }: { current: (typeof TABS)[number]["href"]; className?: string }) {
  return (
    <nav aria-label="Sections Jouer" className={className}>
      <ul className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1 sm:inline-grid">
        {TABS.map((t) => {
          const on = t.href === current;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-bold transition sm:px-4 ${
                  on ? "bg-forest text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon name={t.icon} className="hidden h-4 w-4 min-[400px]:block" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
