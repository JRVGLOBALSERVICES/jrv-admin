import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const id = url.searchParams.get("id"); // identity key

    if (!sessionId && !id) {
      return NextResponse.json({ ok: false, error: "Missing sessionId or id" }, { status: 400 });
    }

    const query = supabaseAdmin
      .from("site_events")
      .select("*")
      .order("created_at", { ascending: true });

    if (sessionId) {
      query.eq("session_id", sessionId);
    } else if (id) {
       if (id.startsWith("fb_")) {
         // Fallback ID: fb_IP_UA_URL_TIME
         // We can try to match by the IP part
         const parts = id.split("_");
         const maybeIp = parts[1];
         if (maybeIp && maybeIp !== "unknown") {
           query.eq("ip", maybeIp);
         } else {
           // Fallback to searching everything including the literal ID
           query.or(`anon_id.eq.${id},session_id.eq.${id},ip.eq.${id}`);
         }
       } else {
         query.or(`anon_id.eq.${id},session_id.eq.${id},ip.eq.${id}`);
       }
    }

    const { data, error } = await query.limit(500);

    if (error) throw error;

    // Filter out localhost
    const filteredEvents = (data || []).filter((r: any) => {
      const u = String(r.page_url || r.page_path || "").toLowerCase();
      const ref = String(r.referrer || "").toLowerCase();
      return !u.includes("localhost") && !ref.includes("localhost");
    }).map((r: any) => {
       // Manual Fix: Patch "walink" page views to be whatsapp_click
       const u = String(r.page_url || r.page_path || "").toLowerCase();
       if (u.includes("walink")) {
           return { ...r, event_name: "whatsapp_click" };
       }
       return r;
    });

    return NextResponse.json({ ok: true, events: filteredEvents });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
