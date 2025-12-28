import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const supabase = await createSupabaseServer();
  const url = new URL(req.url);

  const id = String(url.searchParams.get("id") ?? "").trim();

  if (id) {
    const { data, error } = await supabase
      .from("agreements")
      .select(
        `
        id,
        car_id,
        customer_name,
        id_number,
        mobile,
        date_start,
        date_end,
        booking_duration_days,
        total_price,
        deposit_price,
        status,
        agreement_url,
        whatsapp_url,
        created_at,
        updated_at,
        creator_email,
        cars:car_id (
          plate_number,
          car_catalog:catalog_id ( make, model )
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return jsonError(error.message, 500);
    if (!data) return jsonError("Agreement not found", 404);

    return NextResponse.json({ ok: true, row: data });
  }

  return jsonError("Missing agreement id", 400);
}
