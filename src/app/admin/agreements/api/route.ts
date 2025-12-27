import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("agreements")
    .select(
      `
      id,
      created_at,
      date_start,
      date_end,
      total_price,
      deposit_price,
      status,
      mobile,
      agreement_url,
      whatsapp_url,
      car_id,
      cars:car_id (
        id,
        plate_number,
        catalog:catalog_id (
          make,
          model
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);

  const rows =
    (data ?? []).map((a: any) => {
      const car = a.cars ?? null;
      const catalog = car?.catalog ?? null;

      return {
        id: a.id,
        created_at: a.created_at ?? null,
        date_start: a.date_start ?? null,
        date_end: a.date_end ?? null,
        total_price: Number(a.total_price ?? 0),
        deposit_price: Number(a.deposit_price ?? 0),
        status: a.status ?? null,
        mobile: a.mobile ?? null,
        agreement_url: a.agreement_url ?? null,
        whatsapp_url: a.whatsapp_url ?? null,
        car_id: a.car_id ?? null,
        plate: car?.plate_number ?? null,
        make: catalog?.make ?? null,
        model: catalog?.model ?? null,
      };
    }) ?? [];

  return NextResponse.json({ ok: true, rows });
}
