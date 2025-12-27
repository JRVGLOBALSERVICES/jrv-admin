import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireSuperadmin();
  if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: gate.status });

  const { data: admins, error: adminsErr } = await supabaseAdmin
    .from("admin_users")
    .select("id, user_id, role, created_at")
    .order("created_at", { ascending: false });

  if (adminsErr) return NextResponse.json({ error: adminsErr.message }, { status: 500 });

  const rows = admins ?? [];
  const userIds = new Set(rows.map((r) => r.user_id).filter(Boolean));

  const emailById = new Map<string, string | null>();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    for (const u of data.users) {
      if (userIds.has(u.id)) emailById.set(u.id, u.email ?? null);
    }

    if ([...userIds].every((id) => emailById.has(id))) break;
    if (data.users.length < perPage) break;
    page += 1;
  }

  return NextResponse.json({
    rows: rows.map((r) => ({ ...r, email: emailById.get(r.user_id) ?? null })),
  });
}
