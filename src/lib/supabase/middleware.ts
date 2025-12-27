import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function createSupabaseMiddlewareClient(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set({
              name,
              value,
              ...(options ?? {}),
            });
          });
        },
      },
    }
  );

  return { supabase, res };
}
