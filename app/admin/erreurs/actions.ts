"use server";

import { back, dbMessage, requireStaff } from "@/lib/admin";

export async function clearErrors() {
  const { supabase } = await requireStaff({ adminOnly: true });
  const { error } = await supabase.from("app_errors").delete().gte("id", 0);
  if (error) back("/admin/erreurs", "erreur", dbMessage(error));
  back("/admin/erreurs", "ok", "Erreurs effacées.");
}
