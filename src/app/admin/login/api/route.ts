import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Body = { email: string; password: string };

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as Body;

  // ✅ Always use ONE response object so cookies are written onto it
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...(options ?? {}) });
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user) {
    // Return JSON error (no crash on frontend)
    return NextResponse.json(
      { ok: false, error: error?.message || "Login failed" },
      { status: 401 }
    );
  }

  // ✅ return cookie-writing response
  return res;
}
