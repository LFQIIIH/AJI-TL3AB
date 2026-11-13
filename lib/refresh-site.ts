import { revalidatePath, revalidateTag } from "next/cache";
import { MATCHES_TAG } from "@/lib/matches-source";

/** After an admin change: refresh the public pages right away (instead of within 5 min). */
export function refreshSite() {
  revalidateTag(MATCHES_TAG);
  for (const path of ["/", "/jouer", "/jouer/historique", "/classement", "/compte"]) revalidatePath(path);
  revalidatePath("/match/[id]", "page");
}
