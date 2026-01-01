import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Only protect /admin
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Allow auth endpoints (avoid loops)
  if (
    pathname === "/admin/me" ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/logout")
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

  const redirectToLogin = () => {
    const returnTo = encodeURIComponent(`${pathname}${search || ""}`);
    return NextResponse.redirect(new URL(`/?returnTo=${returnTo}`, req.url));
  };

  // 1) Check user session
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authErr || !user) return redirectToLogin();

  // 2) Validate admin record directly (NO fetch to /admin/me)
  const { data: admin, error: adminErr } = await supabase
    .from("admin_users")
    .select("role,status")
    .eq("user_id", user.id)
    .maybeSingle();

  // "admin/me can't find any data -> /"
  if (adminErr || !admin?.role || !admin?.status) return redirectToLogin();

  // inactive -> /
  if (admin.status !== "active") return redirectToLogin();

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
