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

  const userById = new Map<
    string,
    { email: string | null; banned_until: string | null }
  >();

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    for (const u of data.users) {
      if (userIds.has(u.id)) {
        // banned_until exists on user object when banned
        const bannedUntil = (u as any).banned_until ?? null;
        userById.set(u.id, { email: u.email ?? null, banned_until: bannedUntil });
      }
    }

    if ([...userIds].every((id) => userById.has(id))) break;
    if (data.users.length < perPage) break;
    page += 1;
  }

  const now = Date.now();

  return NextResponse.json({
    rows: rows.map((r) => {
      const u = userById.get(r.user_id);
      const bannedUntil = u?.banned_until ?? null;
      const disabled =
        !!bannedUntil && new Date(bannedUntil).getTime() > now;

      return {
        ...r,
        email: u?.email ?? null,
        banned_until: bannedUntil,
        disabled,
        status: disabled ? "disabled" : "active",
      };
    }),
  });
}
