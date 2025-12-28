import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const url = new URL(req.url);
  const agreement_id = String(url.searchParams.get("agreement_id") ?? "").trim();
  if (!agreement_id) return jsonError("Missing agreement_id");

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("agreement_logs")
    .select("id, agreement_id, actor_email, action, created_at")
    .eq("agreement_id", agreement_id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true, rows: data ?? [] });
}
