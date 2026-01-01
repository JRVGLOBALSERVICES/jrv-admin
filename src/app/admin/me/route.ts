import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = await createSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };

  if (!user) {
    return NextResponse.json(
      { user: null, role: null, status: null },
      { status: 401, headers }
    );
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("role,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        user: { id: user.id, email: user.email },
        role: null,
        status: null,
        db_error: error.message,
      },
      { status: 500, headers }
    );
  }

  return NextResponse.json(
    {
      user: { id: user.id, email: user.email },
      role: data?.role ?? null,
      status: data?.status ?? null,
    },
    { headers }
  );
}
