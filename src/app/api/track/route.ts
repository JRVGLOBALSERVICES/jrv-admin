import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, path, source, details } = body;

    if (!type || !path) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // ✅ EXTRACT CAMPAIGN DATA from URL query params (passed in details or path)
    // Expecting the client to pass full URL or params in details
    let finalDetails = { ...details };

    // Attempt to extract from 'path' string if it contains params
    try {
      if (path && path.includes("?")) {
        const params = new URLSearchParams(path.split("?")[1]);
        const gclid = params.get("gclid");
        const utm_campaign = params.get("utm_campaign");
        const utm_source = params.get("utm_source");

        if (gclid) finalDetails.gclid = gclid;
        if (utm_campaign) finalDetails.campaign = utm_campaign;
        if (utm_source && !source) finalDetails.inferred_source = utm_source;
      }
    } catch {}

    const { error } = await supabase.from("website_events").insert({
      event_type: type,
      path: path.split("?")[0], // Store clean path
      source: source || finalDetails.inferred_source || "direct",
      details: finalDetails, // Store full details including gclid/campaign
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
