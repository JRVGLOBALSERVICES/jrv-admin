import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function requireSuperadmin(): Promise<
  | { ok: true; user: { id: string; email?: string | null } }
  | { ok: false; status: number; message: string }
> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op in server actions/routes (not needed here)
        },
      },
    }
  );

  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr || !u?.user) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const { data: adminRow, error: rErr } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", u.user.id)
    .maybeSingle();

  if (rErr) {
    return { ok: false, status: 500, message: rErr.message };
  }

  if (!adminRow || adminRow.role !== "superadmin") {
    return { ok: false, status: 403, message: "Access denied" };
  }

  return {
    ok: true,
    user: { id: u.user.id, email: u.user.email },
  };
}
