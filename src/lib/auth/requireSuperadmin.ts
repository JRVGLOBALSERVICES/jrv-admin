import { createSupabaseServer } from "@/lib/supabase/server";

export async function requireSuperadmin() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { ok: false as const, status: 401, message: "Not authenticated" };
  }

  // IMPORTANT: this query is allowed by your non-recursive RLS:
  // admin_users SELECT where user_id = auth.uid()
  const { data: row, error: roleErr } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleErr || !row?.role) {
    return { ok: false as const, status: 403, message: "No admin role" };
  }

  if (row.role !== "superadmin") {
    return { ok: false as const, status: 403, message: "Superadmin only" };
  }

  return { ok: true as const, user };
}
