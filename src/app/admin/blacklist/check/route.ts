import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { type, value } = await req.json();
  // Normalize value for comparison (strip spaces, dashes)
  const clean = String(value).replace(/[^a-zA-Z0-9+]/g, ""); 
  
  // Partial match or exact match depending on preference. 
  // Here we do exact match on clean string, assuming blacklist is stored clean.
  const { data } = await supabase
    .from("blacklist")
    .select("*")
    .eq("type", type)
    .ilike("value", `%${clean}%`) // Fuzzy match if value is inside
    .limit(1);

  if (data && data.length > 0) {
    return NextResponse.json({ blacklisted: true, entry: data[0] });
  }
  return NextResponse.json({ blacklisted: false });
}