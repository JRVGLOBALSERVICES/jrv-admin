import { createSupabaseServer } from "@/lib/supabase/server";

export type Role = "superadmin" | "admin";

export type Gate =
  | { ok: true; id: string; role: Role }
  | { ok: false; status: number; message: string };

export async function requireRole(allowed: Role[]): Promise<Gate> {
  const supabase = await createSupabaseServer();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;

  if (authErr || !user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("role,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false, status: 500, message: error.message };
  if (!data?.role)
    return { ok: false, status: 403, message: "No role assigned" };
  if (data.status !== "active")
    return { ok: false, status: 403, message: "Account disabled" };

  const role = data.role as Role;
  if (!allowed.includes(role))
    return { ok: false, status: 403, message: "Forbidden" };

  return { ok: true, id: user.id, role };
}
