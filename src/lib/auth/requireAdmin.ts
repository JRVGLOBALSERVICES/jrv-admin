import { createSupabaseServer } from "@/lib/supabase/server";

export type GateOk = {
  ok: true;
  id: string;
  role: "admin" | "superadmin";
};

export type GateFail = {
  ok: false;
  status: number;
  message: string;
};

export type Gate = GateOk | GateFail;

export async function requireAdmin(): Promise<Gate> {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, message: "Unauthenticated" };
  }

  const { data: admin, error: adminErr } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminErr || !admin) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  return {
    ok: true,
    id: user.id,
    role: admin.role,
  };
}
