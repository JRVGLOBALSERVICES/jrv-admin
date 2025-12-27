import { createSupabaseServer } from "@/lib/supabase/server";

export async function requireSuperadmin() {
  const supabase = await createSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    const err = new Error("Unauthorized");
    (err as any).status = 401;
    throw err;
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("role,status")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error || !data || data.role !== "superadmin" || data.status !== "active") {
    const err = new Error("Forbidden");
    (err as any).status = 403;
    throw err;
  }

  return auth.user;
}
