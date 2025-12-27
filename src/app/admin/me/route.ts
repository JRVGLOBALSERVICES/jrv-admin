import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ user: null, role: null }, { status: 401 });

  const { data: row, error } = await supabase
    .from("admin_users")
    .select("role,status,email")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return NextResponse.json({
    user: { id: auth.user.id, email: auth.user.email },
    role: row?.role ?? null,
    status: row?.status ?? null,
    db_error: error?.message ?? null,
  });
}
