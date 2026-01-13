import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const id = url.searchParams.get("id"); // identity key

    if (!sessionId && !id) {
      return NextResponse.json(
        { ok: false, error: "Missing sessionId or id" },
        { status: 400 }
      );
    }

    const query = supabaseAdmin
      .from("site_events")
      .select("*")
      .order("created_at", { ascending: true });

    if (sessionId) {
      query.eq("session_id", sessionId);
    } else if (id) {
      // 🚀 RESTORE TIMELINE: Handle identity keys like "anon_ABC_2026-01-13" or "fp_1.1.1.1_UA_2026-01-13"
      const lastUnderscore = id.lastIndexOf("_");
      let coreId = id;
      let bizDay = "";

      if (lastUnderscore !== -1) {
        const potentialDate = id.slice(lastUnderscore + 1);
        if (/^\d{4}-\d{2}-\d{2}$/.test(potentialDate)) {
          coreId = id.slice(0, lastUnderscore);
          bizDay = potentialDate;
        }
      }

      // 1. Identity filtering
      if (coreId.startsWith("fp_")) {
        // Extract IP from fingerprint: fp_1.1.1.1_...
        const parts = coreId.split("_");
        const ip = parts[1];
        if (ip && ip !== "unknown") {
          query.eq("ip", ip);
        } else {
          query.or(
            `anon_id.eq.${coreId},session_id.eq.${coreId},ip.eq.${coreId}`
          );
        }
      } else {
        query.or(
          `anon_id.eq.${coreId},session_id.eq.${coreId},ip.eq.${coreId}`
        );
      }

      // 2. Business Day filtering (6 AM KL Boundary)
      if (bizDay) {
        // bizDay is YYYY-MM-DD (KL time)
        // 6 AM KL = 10 PM UTC (Previous day)
        const dayStartKl = new Date(`${bizDay}T06:00:00+08:00`);
        const dayEndKl = new Date(dayStartKl.getTime() + 24 * 60 * 60 * 1000);

        query.gte("created_at", dayStartKl.toISOString());
        query.lt("created_at", dayEndKl.toISOString());
      }
    }

    const { data, error } = await query.limit(500);

    if (error) throw error;

    // Filter out localhost
    const filteredEvents = (data || [])
      .filter((r: any) => {
        const u = String(r.page_url || r.page_path || "").toLowerCase();
        const ref = String(r.referrer || "").toLowerCase();
        return !u.includes("localhost") && !ref.includes("localhost");
      })
      .map((r: any) => {
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
