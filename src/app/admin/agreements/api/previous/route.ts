import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
    const supabase = await createSupabaseServer();
    const body = await req.json();
    const { ic, mobile } = body;

    if (!ic && !mobile) return NextResponse.json({ ok: false, error: "Missing params" });

    let query = supabase
        .from("agreements")
        .select(`
      id, date_start, status, total_price,
      cars:car_id ( plate_number )
    `)
        .order("date_start", { ascending: false })
        .limit(3);

    if (ic) query = query.eq("id_number", ic);
    else if (mobile) query = query.eq("mobile", mobile);

    const { data: rows, error } = await query;

    if (error) return NextResponse.json({ ok: false, error: error.message });

    return NextResponse.json({ ok: true, rows });
}
