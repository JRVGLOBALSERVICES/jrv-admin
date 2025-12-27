import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

type Body = { email: string; password: string };

export async function POST(req: Request) {
  const { email, password } = (await req.json()) as Body;

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return NextResponse.json({ error: error.message }, { status: 401 });
  return NextResponse.json({ ok: true });
}
