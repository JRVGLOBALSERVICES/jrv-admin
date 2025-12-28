// src/lib/auth/requireSuperadminGate.ts
import { createSupabaseServer } from "@/lib/supabase/server";

export type GateOk = { ok: true; id: string; role: "superadmin" };
export type GateFail = { ok: false; status: number; message: string };
export type Gate = GateOk | GateFail;

export async function requireSuperadminGate(): Promise<Gate> {
  const supabase = await createSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, status: 401, message: "Unauthorized" };

  const { data, error } = await supabase
    .from("admin_users")
    .select("role,status")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error || !data) return { ok: false, status: 403, message: "Forbidden" };
  if (data.status !== "active") return { ok: false, status: 403, message: "Disabled" };
  if (data.role !== "superadmin") return { ok: false, status: 403, message: "Forbidden" };

  return { ok: true, id: auth.user.id, role: "superadmin" };
}
