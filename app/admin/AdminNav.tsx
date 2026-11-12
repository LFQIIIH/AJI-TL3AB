import Link from "next/link";
import type { StaffRole } from "@/lib/admin";
import { signOutAdmin } from "./actions";

const LINKS = [
  { href: "/admin", label: "Matchs", adminOnly: false },
  { href: "/admin/terrains", label: "Terrains", adminOnly: true },
  { href: "/admin/equipe", label: "Équipe", adminOnly: true },
];

/** Header of every admin page: title, tabs, flash message. */
export default function AdminNav({
  role,
  current,
  title,
  ok,
  erreur,
}: {
  role: StaffRole;
  current: string;
  title: string;
  ok?: string;
  erreur?: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{role === "admin" ? "Espace admin" : "Espace capitaine"}</p>
          <h1 className="headline mt-2 text-4xl sm:text-5xl">{title}</h1>
        </div>
        <form action={signOutAdmin}>
          <button type="submit" className="btn-ghost">
            Déconnexion
          </button>
        </form>
      </div>
      <nav aria-label="Admin" className="mt-6 flex flex-wrap gap-2">
        {LINKS.filter((l) => role === "admin" || !l.adminOnly).map((l) => (
          <Link key={l.href} href={l.href} className={`chip ${current === l.href ? "chip-on" : "chip-off"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
      {ok && <p className="mt-5 rounded-xl bg-highlight/40 px-4 py-3 text-sm font-semibold text-highlight-ink" role="status">{ok}</p>}
      {erreur && <p className="mt-5 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{erreur}</p>}
    </div>
  );
}
