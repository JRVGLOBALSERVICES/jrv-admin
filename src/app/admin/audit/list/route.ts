import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireSuperadmin();
  if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: gate.status });

  const { data: logs, error } = await supabaseAdmin
    .from("admin_audit_logs")
    .select("id, actor_user_id, target_user_id, action, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = logs ?? [];
  const ids = new Set<string>();
  rows.forEach((r) => {
    if (r.actor_user_id) ids.add(r.actor_user_id);
    if (r.target_user_id) ids.add(r.target_user_id);
  });

  const emailById = new Map<string, string | null>();

  let page = 1;
  const perPage = 200;

  while (ids.size && true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    for (const u of data.users) {
      if (ids.has(u.id)) emailById.set(u.id, u.email ?? null);
    }

    if ([...ids].every((id) => emailById.has(id))) break;
    if (data.users.length < perPage) break;
    page += 1;
  }

  return NextResponse.json({
    rows: rows.map((r) => ({
      ...r,
      actor_email: emailById.get(r.actor_user_id) ?? null,
      target_email: r.target_user_id ? emailById.get(r.target_user_id) ?? null : null,
    })),
  });
}
