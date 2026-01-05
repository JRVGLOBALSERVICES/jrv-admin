import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  classifyTraffic,
  extractModelKey,
  parseAddress,
} from "@/lib/siteEventsAnalytic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";

    // 1. Fetch Raw Data
    const { data: rows } = await supabaseAdmin
      .from("site_events")
      .select("*")
      .gte("created_at", from)
      .lte("created_at", to)
      .limit(5000);

    const safeRows = rows || [];

    // 2. Aggregate
    const traffic = { Paid: 0, Organic: 0, Direct: 0, Referral: 0 };
    const modelCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();
    const regionCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    const campaigns = new Map<string, { count: number; conversions: number }>();
    let whatsappClicks = 0;
    let phoneClicks = 0;
    let pageViews = 0;

    for (const r of safeRows) {
      // Metrics
      const en = (r.event_name || "").toLowerCase();
      if (en === "page_view") pageViews++;
      if (en === "whatsapp_click") whatsappClicks++;
      if (en === "phone_click") phoneClicks++;

      // Traffic
      const type = classifyTraffic(r);
      traffic[type] = (traffic[type] || 0) + 1;

      // Models
      if (en === "model_click" || en === "page_view") {
        const model = extractModelKey(r);
        if (model) modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
      }

      // Campaigns (Strictly from URL)
      if (type === "Paid") {
        const u = new URL(
          r.page_url?.startsWith("http")
            ? r.page_url
            : `http://dummy.com${r.page_url}`
        );
        const cid =
          u.searchParams.get("gad_campaignid") ||
          u.searchParams.get("utm_campaign") ||
          "Unknown Campaign";
        const prev = campaigns.get(cid) || { count: 0, conversions: 0 };
        prev.count++;
        if (en === "whatsapp_click" || en === "phone_click") prev.conversions++;
        campaigns.set(cid, prev);
      }

      // Locations (Prefer Exact Address)
      if (r.exact_address) {
        const { city, region, country } = parseAddress(r.exact_address);
        if (city && city !== "Unknown")
          cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
        if (region && region !== "Unknown")
          regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
        if (country && country !== "Unknown")
          countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
      } else if (r.city) {
        // Fallback to IP data
        cityCounts.set(r.city, (cityCounts.get(r.city) || 0) + 1);
        if (r.region)
          regionCounts.set(r.region, (regionCounts.get(r.region) || 0) + 1);
        if (r.country)
          countryCounts.set(r.country, (countryCounts.get(r.country) || 0) + 1);
      }
    }

    // 3. Helper to sort
    const toList = (map: Map<string, number>, limit = 10) =>
      Array.from(map.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

    // 4. Latest GPS (Formatted)
    const latestGps = safeRows
      .filter((r) => r.exact_address)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 15)
      .map((r) => ({
        ...r,
        parsed: parseAddress(r.exact_address),
      }));

    return NextResponse.json({
      ok: true,
      pageViews,
      whatsappClicks,
      phoneClicks,
      traffic: {
        paid: traffic.Paid,
        organic: traffic.Organic,
        direct: traffic.Direct,
        referral: traffic.Referral,
      },
      topModels: toList(modelCounts),
      topCities: toList(cityCounts),
      topRegions: toList(regionCounts),
      topCountries: toList(countryCounts),
      campaigns: Array.from(campaigns.entries())
        .map(([key, val]) => ({ campaign: key, ...val }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      latestGps,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
