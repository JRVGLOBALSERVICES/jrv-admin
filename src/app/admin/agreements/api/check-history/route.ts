import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok)
    return NextResponse.json(
      { ok: false, error: gate.message },
      { status: gate.status }
    );

  const supabase = await createSupabaseServer();
  const { ic, mobile } = await req.json();

  if (!ic && !mobile) {
    return NextResponse.json({ ok: false, found: false });
  }

  // Search for the most recent agreement matching IC or Mobile
  // We prefer matches with an IC URL if possible
  let query = supabase
    .from("agreements")
    .select("customer_name, id_number, mobile, ic_url, created_at")
    .neq("status", "Deleted")
    .neq("status", "Cancelled")
    .order("created_at", { ascending: false })
    .limit(1);

  if (ic && mobile) {
    query = query.or(`id_number.eq.${ic},mobile.eq.${mobile}`);
  } else if (ic) {
    query = query.eq("id_number", ic);
  } else if (mobile) {
    query = query.eq("mobile", mobile);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("History check error:", error);
    return NextResponse.json({ ok: false, error: error.message });
  }

  if (data) {
    return NextResponse.json({ ok: true, found: true, agreement: data });
  }

  return NextResponse.json({ ok: true, found: false });
}
