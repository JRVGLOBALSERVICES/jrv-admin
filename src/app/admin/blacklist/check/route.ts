import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { type, value } = await req.json();

    if (!value) return NextResponse.json({ blacklisted: false });

    // 1. Original format (e.g., "050312-14-0682")
    const raw = String(value).trim();

    // 2. Clean format (e.g., "050312140682")
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "");

    // 3. Search for BOTH formats
    // This finds the entry even if the DB has dashes and we search clean, or vice versa.
    const { data } = await supabase
      .from("blacklist")
      .select("*")
      .eq("type", type)
      .or(`value.ilike.%${raw}%,value.ilike.%${clean}%`)
      .limit(1);

    if (data && data.length > 0) {
      return NextResponse.json({ blacklisted: true, entry: data[0] });
    }

    return NextResponse.json({ blacklisted: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
