"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { SITE_PHOTOS_TAG } from "@/lib/site-photos";

/** After adding or removing a photo: refresh the homepage right away. */
export async function refreshHomePhotos() {
  await requireStaff({ adminOnly: true });
  revalidateTag(SITE_PHOTOS_TAG);
  revalidatePath("/");
}
