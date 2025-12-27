import type { NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login + static assets
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return;
  }

  // Only protect admin routes
  if (!pathname.startsWith("/admin")) {
    return;
  }

  const { supabase, res } = createSupabaseMiddlewareClient(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/admin/login", req.url);
    return Response.redirect(loginUrl);
  }

  // 🔥 IMPORTANT: return the mutated response
  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
