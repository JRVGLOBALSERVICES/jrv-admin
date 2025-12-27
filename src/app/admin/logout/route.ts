import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();

  const url = new URL("/admin/login", req.url);
  return NextResponse.redirect(url);
}
