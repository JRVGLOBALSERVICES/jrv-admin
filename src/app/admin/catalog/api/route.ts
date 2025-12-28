import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: 403 });
  }

  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("car_catalog")
    .select("id, make, model, default_images") // ✅ MUST INCLUDE THIS
    .eq("is_active", true)
    .order("make", { ascending: true })
    .order("model", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
