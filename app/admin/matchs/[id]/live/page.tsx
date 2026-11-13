import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatAdminDate, requireStaff } from "@/lib/admin";
import { loadLive } from "./data";
import LiveScreen from "./LiveScreen";

export const metadata: Metadata = { title: "Direct du match", robots: { index: false, follow: false } };

const OPENS_BEFORE_MS = 30 * 60 * 1000;
const CLOSES_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

/** Captain's phone screen during the match: teams, goals, assists, cards. */
export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireStaff();
  const matchId = decodeURIComponent((await params).id);
  const { data: match } = await supabase.from("matches").select("id, starts_at, status, pitches(name)").eq("id", matchId).maybeSingle();
  if (!match) notFound();
  const start = new Date(match.starts_at).getTime();
  const now = Date.now();
  const open = match.status === "published" && now >= start - OPENS_BEFORE_MS && now <= start + CLOSES_AFTER_MS;
  const back = `/admin/matchs/${encodeURIComponent(matchId)}`;
  const pitch = (match.pitches as { name?: string } | null)?.name;

  return (
    <>
      <p className="mb-2">
        <Link href={back} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Fiche du match
        </Link>
      </p>
      <h1 className="eyebrow capitalize">
        Direct · {formatAdminDate(match.starts_at)}
        {pitch ? ` · ${pitch}` : ""}
      </h1>
      {open ? (
        <LiveScreen matchId={matchId} initial={await loadLive(supabase, matchId)} />
      ) : (
        <p className="card mt-6 p-6 text-ink-muted">
          {match.status !== "published"
            ? "Ce match n'est pas publié."
            : now < start - OPENS_BEFORE_MS
              ? "Le direct s'ouvre 30 minutes avant le coup d'envoi."
              : "Le direct est fermé (plus de 3 jours après le match). Corrige le score depuis la fiche du match."}
        </p>
      )}
    </>
  );
}
