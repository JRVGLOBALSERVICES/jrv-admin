import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: gate.status });

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("marketing_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Return user role so frontend knows if they can delete
  return NextResponse.json({ ok: true, rows: data, role: gate.role });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: gate.status });

  // STRICT CHECK: Only superadmin can delete logs
  if (gate.role !== 'superadmin') {
    return NextResponse.json({ error: "Only superadmin can delete logs" }, { status: 403 });
  }

  const body = await req.json();
  if (body.action === 'delete') {
    const { id } = body;
    const { error } = await supabaseAdmin.from("marketing_logs").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}