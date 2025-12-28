import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return NextResponse.json(
      { user: null, role: null, status: null },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("role,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { user: { id: user.id, email: user.email }, role: null, status: null, db_error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    role: data?.role ?? null,
    status: data?.status ?? null,
  });
}
