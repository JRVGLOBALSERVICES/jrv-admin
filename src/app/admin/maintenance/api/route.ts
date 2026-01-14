import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { carAuditLog } from "@/lib/audit/carAudit";
import { sendSlackNotification } from "@/lib/slack";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const actorId = gate.id;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonError("Missing SUPABASE_SERVICE_ROLE_KEY on server", 500);
  }

  const body = (await req.json()) as any;
  const action = String(body?.action ?? "");

  if (action === "update_maintenance") {
    const id = String(body?.id ?? "").trim();
    if (!id) return jsonError("Missing car id");

    const current_mileage = Number(body?.current_mileage);
    const next_service_mileage = Number(body?.next_service_mileage);
    const next_gear_oil_mileage = Number(body?.next_gear_oil_mileage);
    const next_tyre_mileage = Number(body?.next_tyre_mileage);
    const next_brake_pad_mileage = Number(body?.next_brake_pad_mileage);

    if (isNaN(current_mileage)) return jsonError("Invalid current mileage");

    // Fetch car before update for audit and validation (if enabled)
    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("cars")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (beforeErr) return jsonError(beforeErr.message, 400);
    if (!before) return jsonError("Car not found", 404);

    // USER REQUEST: Skip validation for mileage being lesser than current.
    // if (current_mileage < (before.current_mileage ?? 0)) {
    //    return jsonError(`New mileage (${current_mileage}) cannot be less than current (${before.current_mileage})`);
    // }

    const now = new Date().toISOString();
    const updates = {
      current_mileage,
      next_service_mileage: isNaN(next_service_mileage)
        ? null
        : next_service_mileage,
      next_gear_oil_mileage: isNaN(next_gear_oil_mileage)
        ? null
        : next_gear_oil_mileage,
      next_tyre_mileage: isNaN(next_tyre_mileage) ? null : next_tyre_mileage,
      next_brake_pad_mileage: isNaN(next_brake_pad_mileage)
        ? null
        : next_brake_pad_mileage,
      updated_at: now,
    };

    const { data: after, error: updErr } = await supabaseAdmin
      .from("cars")
      .update(updates)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (updErr) return jsonError(updErr.message, 400);

    await carAuditLog({
      actor_user_id: actorId,
      action: "UPDATE_MAINTENANCE",
      car_id: id,
      meta: { old: before, new: updates },
    });

    // Notification logic removed as per request (only showing Audit Logs now)

    return NextResponse.json({ ok: true });
  }

  return jsonError("Unknown action");
}
