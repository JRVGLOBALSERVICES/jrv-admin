import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

type Body = { email?: string; password?: string };

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServer();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code ?? null,
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    user: data.user?.email ?? null,
  });
}
