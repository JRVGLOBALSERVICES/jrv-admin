import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/log";

type Body = { user_id: string };

export async function POST(req: Request) {
  const gate = await requireSuperadmin();
  if (!gate.ok)
    return NextResponse.json({ error: gate.message }, { status: gate.status });

  const { user_id } = (await req.json()) as Body;
  if (!user_id)
    return NextResponse.json({ error: "user_id required" }, { status: 400 });

  // ✅ Supabase typing supports ban_duration, not banned_until
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
    ban_duration: "876000h", // 100 years
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Optional but recommended: also remove admin access
  await supabaseAdmin.from("admin_users").delete().eq("user_id", user_id);

  await logAdminAction({
    actor_user_id: gate.user.id,
    target_user_id: user_id,
    action: "DISABLE_USER",
    details: { ban_duration: "876000h" },
  });

  return NextResponse.json({ ok: true });
}
