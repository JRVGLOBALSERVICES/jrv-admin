import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Body = { user_id: string };

export async function POST(req: Request) {
  const gate = await requireSuperadmin();
  if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: gate.status });

  const { user_id } = (await req.json()) as Body;
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("admin_users").delete().eq("user_id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
