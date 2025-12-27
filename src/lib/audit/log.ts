import { supabaseAdmin } from "@/lib/supabase/admin";

export async function auditLog(
  actorUserId: string,
  action: string,
  targetUserId?: string | null,
  meta?: Record<string, any> | null
) {
  // Writes with SERVICE ROLE => RLS won’t block
  const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    target_user_id: targetUserId ?? null,
    meta: meta ?? null,
  });

  if (error) {
    // don't crash the app, but do show in server logs
    console.error("AUDIT INSERT FAILED:", error.message, error.details ?? "");
  }
}
