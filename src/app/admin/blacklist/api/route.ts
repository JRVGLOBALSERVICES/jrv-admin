import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("blacklist")
    .select("*")
    .order("created_at", { ascending: false });
  return NextResponse.json({ ok: !error, rows: data });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === "create") {
    // Basic normalization
    const cleanValue = String(body.value).replace(/\s/g, "").trim();
    const { error } = await supabase.from("blacklist").insert({
      type: body.type,
      value: cleanValue, // Store raw or standard format
      reason: body.reason,
    });
    return NextResponse.json({ ok: !error });
  }
  if (body.action === "delete") {
    const { error } = await supabase
      .from("blacklist")
      .delete()
      .eq("id", body.id);
    return NextResponse.json({ ok: !error });
  }
  return NextResponse.json({ error: "Invalid action" });
}
