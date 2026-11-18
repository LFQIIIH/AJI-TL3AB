import Link from "next/link";
import { CalendarDays, History, Trophy } from "lucide-react";

const TABS = [
  { href: "/jouer", label: "Matchs", icon: CalendarDays },
  { href: "/jouer/historique", label: "Historique", icon: History },
  { href: "/classement", label: "Classement", icon: Trophy },
] as const;

/** Matchs · Historique · Classement — real links (crawlable), current tab highlighted. */
export default function JouerTabs({ current, className = "" }: { current: (typeof TABS)[number]["href"]; className?: string }) {
  return (
    <nav aria-label="Sections Jouer" className={className}>
      <ul className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1 sm:inline-grid">
        {TABS.map((t) => {
          const on = t.href === current;
          const TabIcon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-1.5 text-[13px] font-bold min-[400px]:text-sm transition sm:px-4 ${
                  on ? "bg-forest text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                <TabIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
