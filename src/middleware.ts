import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname, origin, search } = req.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // ✅ Allow these paths to avoid loops / blocking login + auth checks
  if (
    pathname === "/admin/me" ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/logout")
  ) {
    return NextResponse.next();
  }

  // Response object used for Supabase cookie refresh
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

  // helper: redirect to / with returnTo
  const redirectToLogin = () => {
    const returnTo = encodeURIComponent(`${pathname}${search || ""}`);
    return NextResponse.redirect(new URL(`/?returnTo=${returnTo}`, req.url));
  };

  // 1) Auth session check
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return redirectToLogin();

  // 2) Admin validation: if /admin/me has no data -> kick to /
  try {
    const meRes = await fetch(`${origin}/admin/me`, {
      headers: {
        cookie: req.headers.get("cookie") || "",
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!meRes.ok) return redirectToLogin();

    const me = await meRes.json();

    // Your /admin/me returns: { user, role, status }
    if (!me?.user || !me?.role || !me?.status) return redirectToLogin();

    // optional: enforce active admins only
    if (me.status !== "active") return redirectToLogin();
  } catch {
    return redirectToLogin();
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
