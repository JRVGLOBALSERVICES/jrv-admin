import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServer();
  const url = new URL(req.url);

  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const status = (url.searchParams.get("status") ?? "").trim();
  const from = url.searchParams.get("from"); // yyyy-mm-dd
  const to = url.searchParams.get("to");     // yyyy-mm-dd
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

  // Pull agreements + joins. We'll filter/sort in JS for predictable behavior.
  const { data, error } = await supabase
    .from("agreements")
    .select(`
      id,
      id_number,
      mobile,
      date_start,
      date_end,
      total_price,
      deposit_price,
      status,
      agreement_url,
      whatsapp_url,
      updated_at,
      car_id,
      cars:car_id (
        id,
        plate_number,
        catalog:catalog_id (
          make,
          model
        )
      )
    `)
    .limit(limit);

  if (error) return jsonError(error.message, 500);

  const rows =
    (data ?? []).map((a: any) => {
      const car = a.cars ?? null;
      const cat = car?.catalog ?? null;

      return {
        id: a.id as string,
        id_number: (a.id_number ?? "") as string,
        mobile: (a.mobile ?? "") as string,
        date_start: (a.date_start ?? null) as string | null,
        date_end: (a.date_end ?? null) as string | null,
        total_price: Number(a.total_price ?? 0),
        deposit_price: Number(a.deposit_price ?? 0),
        status: (a.status ?? "") as string,
        agreement_url: (a.agreement_url ?? null) as string | null,
        whatsapp_url: (a.whatsapp_url ?? null) as string | null,
        updated_at: (a.updated_at ?? null) as string | null,
        car_id: (a.car_id ?? null) as string | null,

        plate_number: (car?.plate_number ?? null) as string | null,
        make: (cat?.make ?? null) as string | null,
        model: (cat?.model ?? null) as string | null,
      };
    }) ?? [];

  // Filters
  let filtered = rows;

  if (status) {
    filtered = filtered.filter((r) => String(r.status || "").toLowerCase() === status.toLowerCase());
  }

  if (from) {
    const fromD = parseDate(from);
    if (fromD) filtered = filtered.filter((r) => {
      const s = parseDate(r.date_start);
      return s ? s >= fromD : false;
    });
  }

  if (to) {
    const toD = parseDate(to);
    if (toD) filtered = filtered.filter((r) => {
      const s = parseDate(r.date_start);
      return s ? s <= new Date(toD.getTime() + 24 * 60 * 60 * 1000 - 1) : false;
    });
  }

  if (q) {
    filtered = filtered.filter((r) => {
      const hay = [
        r.plate_number ?? "",
        r.make ?? "",
        r.model ?? "",
        r.mobile ?? "",
        r.id_number ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  // Sort: date_start desc, date_end desc, updated_at desc
  filtered.sort((a, b) => {
    const as = parseDate(a.date_start)?.getTime() ?? 0;
    const bs = parseDate(b.date_start)?.getTime() ?? 0;
    if (bs !== as) return bs - as;

    const ae = parseDate(a.date_end)?.getTime() ?? 0;
    const be = parseDate(b.date_end)?.getTime() ?? 0;
    if (be !== ae) return be - ae;

    const au = parseDate(a.updated_at)?.getTime() ?? 0;
    const bu = parseDate(b.updated_at)?.getTime() ?? 0;
    return bu - au;
  });

  // Debug to spot missing joins quickly
  const debug = {
    total: rows.length,
    filtered: filtered.length,
    missing_car_id: filtered.filter((r) => !r.car_id).length,
    join_missing_car: filtered.filter((r) => r.car_id && !r.plate_number).length,
    join_missing_catalog: filtered.filter((r) => r.plate_number && (!r.make || !r.model)).length,
    missing_date_start: filtered.filter((r) => !r.date_start).length,
    missing_date_end: filtered.filter((r) => !r.date_end).length,
  };

  return NextResponse.json({ ok: true, debug, rows: filtered });
}
