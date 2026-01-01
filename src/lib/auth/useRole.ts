"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client"; // ✅ Now matches Step 1
import { useRouter } from "next/navigation";
import { type AuthChangeEvent } from "@supabase/supabase-js";

export type RoleState = {
  loading: boolean;
  role: "admin" | "superadmin" | null;
  email: string | null;
  id: string | null;
};

export function useRole() {
  const [state, setState] = useState<RoleState>({
    loading: true,
    role: null,
    email: null,
    id: null,
  });
  const router = useRouter();

  // Initialize safely
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          if (mounted) {
            setState({ loading: false, role: null, email: null, id: null });
            // Redirect to root if user tries to access admin without session
            if (window.location.pathname.startsWith("/admin")) {
              router.replace("/");
            }
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (mounted) {
          setState({
            loading: false,
            role: (profile?.role as any) ?? "admin",
            email: session.user.email ?? "",
            id: session.user.id,
          });
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        // ✅ CRITICAL FIX: Ensure loading stops even on error
        if (mounted) setState((prev) => ({ ...prev, loading: false }));
      }
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT") {
        router.replace("/");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return state;
}
