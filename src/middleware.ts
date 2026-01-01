import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow auth-related routes
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/logout") ||
    pathname === "/admin/me"
  ) {
    return NextResponse.next();
  }

  let res = NextResponse.next();

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

  // 🔒 Auth check ONLY
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    // 🚫 NO returnTo
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
