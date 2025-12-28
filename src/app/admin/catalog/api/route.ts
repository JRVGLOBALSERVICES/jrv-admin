import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("car_catalog")
    .select("id, make, model")
    .eq("is_active", true)
    .order("model", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
