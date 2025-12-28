// src/lib/audit/carAudit.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CarAuditAction = "CREATE_CAR" | "UPDATE_CAR" | "DELETE_CAR";

export async function carAuditLog(args: {
  actor_user_id: string;
  action: CarAuditAction;
  car_id?: string | null;
  meta?: any;
}) {
  try {
    const { error } = await supabaseAdmin.from("car_audit_logs").insert({
      actor_user_id: args.actor_user_id,
      action: args.action,
      car_id: args.car_id ?? null,
      meta: args.meta ?? null,
    });

    if (error) {
      console.error("CAR AUDIT LOG FAILED:", {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        args,
      });
    }
  } catch (e) {
    console.error("CAR AUDIT LOG CRASHED:", e, args);
  }
}
