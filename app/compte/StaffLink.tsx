"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSessionUser } from "@/lib/supabase/useSession";

/** "Espace admin / capitaine" shortcut, only for staff. */
export default function StaffLink() {
  const user = useSessionUser();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getSupabaseBrowserClient()
      .rpc("my_staff_role")
      .then(({ data }) => !cancelled && setRole(typeof data === "string" ? data : null));
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (role !== "admin" && role !== "captain") return null;
  return (
    <Link href="/admin" className="btn-primary mb-4 w-full">
      {role === "admin" ? "Espace admin" : "Espace capitaine"} →
    </Link>
  );
}
