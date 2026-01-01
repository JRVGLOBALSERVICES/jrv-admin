import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

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

  // Helper: redirect to login while preserving the return URL
  const redirectToLogin = () => {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.searchParams.set("returnTo", pathname + (search || ""));
    return NextResponse.redirect(loginUrl);
  };

  // 1) Auth session check
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return redirectToLogin();

  // 2) Admin validation: Check DB directly (Faster & Reliable)
  try {
    const { data: adminUser, error } = await supabase
      .from("admin_users")
      .select("role, status")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    // If DB error, no record found, no role, or not active -> kick out
    if (
      error ||
      !adminUser ||
      !adminUser.role ||
      adminUser.status !== "active"
    ) {
      return redirectToLogin();
    }
  } catch (err) {
    return redirectToLogin();
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
