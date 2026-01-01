import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServer } from "@/lib/supabase/server";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);


  const supabase = await createSupabaseServer();
  const url = new URL(req.url);

  const agreement_id = String(url.searchParams.get("agreement_id") ?? "").trim();

  let q = supabase
    .from("agreement_logs")
    .select("id, agreement_id, actor_id, actor_email, action, created_at, before, after")
    .order("created_at", { ascending: false })
    .limit(500);

  if (agreement_id) q = q.eq("agreement_id", agreement_id);

  const { data, error } = await q;
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true, rows: data ?? [] });
}
