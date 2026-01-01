import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function createSupabase(req: NextRequest, res: NextResponse) {
  return createServerClient(
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
}

async function handleLogout(req: NextRequest) {
  // Redirect to login page after logout
  const redirectUrl = new URL("/", req.url);

  // Create response early so Supabase can clear cookies onto it
  const res = NextResponse.redirect(redirectUrl);

  const supabase = createSupabase(req, res);

  // Clears Supabase session cookies
  await supabase.auth.signOut();

  return res;
}

// ✅ supports your form POST
export async function POST(req: NextRequest) {
  return handleLogout(req);
}

// ✅ optional: also allow GET (if you ever use a link)
export async function GET(req: NextRequest) {
  return handleLogout(req);
}
