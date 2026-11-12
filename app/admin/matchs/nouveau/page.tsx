import { requireStaff, type Pitch } from "@/lib/admin";
import AdminNav from "../../AdminNav";
import MatchForm from "../../MatchForm";
import { createMatch } from "../../actions";

export default async function NewMatchPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { supabase, role } = await requireStaff({ adminOnly: true });
  const { erreur } = await searchParams;
  const [{ data: pitches }, { data: staff }] = await Promise.all([
    supabase.from("pitches").select("*").order("name"),
    supabase.rpc("admin_list_staff"),
  ]);
  return (
    <>
      <AdminNav role={role} current="/admin" title="Nouveau match" erreur={erreur} />
      <MatchForm action={createMatch} pitches={(pitches ?? []) as Pitch[]} staff={staff ?? []} submitLabel="Créer le match" />
    </>
  );
}
