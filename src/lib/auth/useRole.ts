"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export type Role = "admin" | "superadmin";

export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowser();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setRole((data?.role as Role) ?? null);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { role, loading };
}
