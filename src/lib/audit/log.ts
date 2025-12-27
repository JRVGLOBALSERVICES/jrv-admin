import { supabaseAdmin } from "@/lib/supabase/admin";

export async function logAdminAction(opts: {
  actor_user_id: string;
  target_user_id?: string | null;
  action: string;
  details?: Record<string, any>;
}) {
  const { actor_user_id, target_user_id = null, action, details = {} } = opts;

  await supabaseAdmin.from("admin_audit_logs").insert({
    actor_user_id,
    target_user_id,
    action,
    details,
  });
}
