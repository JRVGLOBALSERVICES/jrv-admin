import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service role to bypass RLS for inserting analytics safely
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, path, source, details } = body;

    // Basic validation
    if (!type || !path) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Fire and forget insert
    const { error } = await supabase.from("website_events").insert({
      event_type: type,
      path,
      source: source || "direct",
      details,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}