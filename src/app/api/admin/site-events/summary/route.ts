import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getIdentityKey,
  inferAcquisitionFromFirstEvent,
  getModelKey,
  referrerLabelFromFirstEvent,
  safeParseProps,
  cleanPagePath,
  normalizeModel,
  getDeviceType,
  getCampaignFromParams,
  isTruthy,
} from "@/lib/site-events";

function toList(
  map: Map<string, number>,
  limit = 10,
  keyName: "key" | "name" = "key"
) {
  const arr = Array.from(map.entries()).map(([k, v]) => ({
    [keyName]: k,
    count: v,
  })) as any[];
  arr.sort((a, b) => b.count - a.count);
  return arr.slice(0, limit);
}

// KNOWN EVENTS to ensure they always appear in filters even if count is 0
const KNOWN_EVENTS = [
    "page_view", "whatsapp_click", "phone_click", "session_start", "click", "submit", 
    "form_submit", "file_download", "scroll", "view_search_results",
    "car_image_click", "consent_granted", "consent_rejected", "filter_click",
    "location_consent_denied", "location_consent_granted", "model_click",
    "view_car", "view_details" 
];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";

    const event = (url.searchParams.get("event") || "").trim();
    const traffic = (url.searchParams.get("traffic") || "").trim();
    const device = (url.searchParams.get("device") || "").trim();
    const path = (url.searchParams.get("path") || "").trim();

    if (!from || !to) {
      return NextResponse.json(
        { ok: false, error: "Missing from/to" },
        { status: 400 }
      );
    }

    // Parallel fetch: 
    // 1. Full data for analysis (limit 20k)
    // 2. Event names only for dropdown (limit 50k to ensure we capture all types)
    const [mainRes, eventsRes] = await Promise.all([
      supabaseAdmin
        .from("site_events")
        .select(
          "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, user_agent, props, ip, country, region, city, isp, exact_address"
        )
        .gte("created_at", from)
        .lt("created_at", to)
        .order("created_at", { ascending: false })
        .limit(20000),
        
      supabaseAdmin
        .from("site_events")
        .select("event_name")
        .gte("created_at", from)
        .lt("created_at", to)
        .limit(50000)
    ]);

    if (mainRes.error) throw mainRes.error;
    
    // Process Full Data
    const base = (mainRes.data || []) as any[];

    // Process Event Names (Merge into a set for the dropdown options)
    const allEventNames = new Set<string>();
    
    // Add Known Events first
    KNOWN_EVENTS.forEach(e => allEventNames.add(e));

    (eventsRes.data || []).forEach((r: any) => {
        if (r.event_name) allEventNames.add(String(r.event_name));
    });

    // Build per-identity sessions (anon_id → session_id → ip)
    const byIdentity = new Map<string, any[]>();

    // ✅ Group ALL fetched rows by identity first (Preserves session context)
    for (const r of base) {
      const k = getIdentityKey(r);
      if (!byIdentity.has(k)) byIdentity.set(k, []);
      byIdentity.get(k)!.push(r);
    }

    // Derive identity-level attributes
    // ... counts ...
    const trafficCounts = {
      paid: 0,
      organic: 0,
      direct: 0,
      referral: 0,
    };
    const deviceCounts = new Map<string, number>();
    const eventCounts = new Map<string, number>();
    const pathCounts = new Map<string, number>();
    const modelCounts = new Map<string, number>();
    const referrerCounts = new Map<string, number>();
    const ispCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();
    const campaignCounts = new Map<
      string,
      { count: number; conversions: number }
    >();
    
    // GPS Data
    const gpsEvents: any[] = [];
    const activeThreshold = new Date(Date.now() - 5 * 60 * 1000).getTime();
    let activeUsers = 0;

    let pageViews = 0;
    let whatsappClicks = 0;
    let phoneClicks = 0;



    // Identity breakdown should match the *final* identity set
    const anonSet = new Set<string>();
    const sessionSet = new Set<string>();
    const ipSet = new Set<string>();

    const identities = Array.from(byIdentity.keys());

    // Identity-based aggregation
    for (const identity of identities) {
      const fullSession = byIdentity.get(identity) || [];
      fullSession.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // 1. Attribution (Start with first event)
      const first = fullSession[0];
      let inf = inferAcquisitionFromFirstEvent(first);

      // Enhance Attribution: Scan FULL session for Ad Params (gclid, utm_source, props, referrer)
      // This fixes cases where the first event might miss params but a subsequent one has them.
      for (const e of fullSession) {
         let foundAd = false;
         let adParams: URLSearchParams | null = null;

         const checkForAds = (str: string | null | undefined) => {
             if (!str) return false;
             if (str.includes("gclid=") || str.includes("wbraid=") || str.includes("gad_source=") || str.includes("gad_campaignid=")) {
                 return true;
             }
             return false;
         };

         const extractParams = (str: string) => {
             try {
                const parts = str.split('?');
                return parts.length > 1 ? new URLSearchParams(parts[1]) : new URLSearchParams(str); // handle if str is just params
             } catch (e) { return null; }
         };

         // 1. Check URL & Path
         if (checkForAds(e.page_url)) {
             foundAd = true;
             adParams = extractParams(e.page_url!);
         } else if (checkForAds(e.page_path)) {
             foundAd = true;
             adParams = extractParams(e.page_path!);
         }

         // 2. Check Referrer (e.g. contains gclid) or Google Domain
         if (!foundAd && e.referrer) {
             if (checkForAds(e.referrer)) {
                 foundAd = true;
                 adParams = extractParams(e.referrer);
             } else if (e.referrer.includes("googleads") || e.referrer.includes("doubleclick")) {
                 foundAd = true;
                 // Domain match only (display ads), no params
             }
         }

         // 3. Check Props (JSON) -> path, url, or direct keys
         if (!foundAd && e.props) {
            const p = safeParseProps(e.props);
            if (p) {
               // Direct keys
               if (p.gclid || p.gad || p.wbraid || p.gbraid || p.gad_source || p.gad_campaignid) {
                   foundAd = true;
                   adParams = new URLSearchParams();
                   if (p.gclid) adParams.set("gclid", String(p.gclid));
                   if (p.utm_campaign) adParams.set("utm_campaign", String(p.utm_campaign));
                   if (p.gad_campaignid) adParams.set("gad_campaignid", String(p.gad_campaignid));
                   if (p.gad_source) adParams.set("gad_source", String(p.gad_source));
               }
               // Nested path/url in props (e.g. {"path": "/?gad_source=1..."})
               if (!foundAd && (checkForAds(p.path) || checkForAds(p.url))) {
                   foundAd = true;
                   adParams = extractParams(p.path || p.url);
               }
            }
         }

         if (foundAd) {
             inf.traffic = "paid";
             // If we previously thought it was Organic/Direct, clear that because we found ads
             if (inf.campaign === "Organic" || inf.campaign === "Direct" || inf.campaign === "Google (Organic)") {
                 inf.campaign = "";
             }

             if (adParams) {
                // Try standard UTM first
                const campaignFromParams = getCampaignFromParams(Object.fromEntries(adParams.entries()));
                if (campaignFromParams) {
                    inf.campaign = campaignFromParams;
                } else if (adParams.get("gad_campaignid")) {
                    inf.campaign = "Google Ads (ID: " + adParams.get("gad_campaignid") + ")";
                } else if (adParams.get("gad_source")) {
                    inf.campaign = "Google Ads (Source: " + adParams.get("gad_source") + ")";
                } else if (!inf.campaign) {
                     inf.campaign = "Google Ads";
                }
             } else if (!inf.campaign) {
                inf.campaign = "Google Ads";
             }
             break; 
         }
      }

      // 2. Apply Filters (Event, Device, Path, Traffic)
      // Let's determine if this Identity is a "match" for the filters.
      
      // Traffic Filter (Session-level)
      if (traffic) {
        const t = inf.traffic || "direct";
        const want = traffic.toLowerCase();
        if (want === "paid" && t !== "paid") continue;
        if (want === "organic" && t !== "organic") continue;
        if (want === "direct" && t !== "direct") continue;
        if (want === "referral" && t !== "referral") continue;
      }

      // Filter Events within the session
      const matchingEvs = fullSession.filter(r => {
        if (event) {
             const wanted = event.split(',').map(s => s.trim().toLowerCase());
             const en = String(r.event_name || "").toLowerCase();
             if (!wanted.includes(en)) return false;
        }
        
        // Fix Mobile Filter: Use getDeviceType on user_agent
        if (device) {
           const d = getDeviceType(r.user_agent);
           const want = device.toLowerCase();
           if (d.toLowerCase() !== want) return false;
        }
        
        if (path) {
          const pp = String(r.page_path || "");
          const pu = String(r.page_url || "");
          if (!pp.includes(path) && !pu.includes(path)) return false;
        }
        return true;
      });

      // If no events match, this user is not part of this "View"
      if (matchingEvs.length === 0) continue;

      const evs = matchingEvs; // Use MATCHING events for counts (Drill-down logic)


      // 1. User-level Stats (Active Status)
      let isOnline = false;
      const userModels = new Set<string>();
      const userDevices = new Set<string>();

      // Track if user is online
      for (const e of evs) {
        if (new Date(e.created_at).getTime() >= activeThreshold) {
          isOnline = true;
        }

        // Model extraction (consistent with page.tsx)
        const mk = getModelKey(e);
        const clean = normalizeModel(mk);
        if (clean && clean !== "Unknown") {
          userModels.add(clean);
        }

        // Device extraction
        // Prefer UA parsing for accuracy (fixes iPhone detected as Desktop issue)
        const dt = getDeviceType(e.user_agent) || e.device_type;
        if (isTruthy(dt)) {
          userDevices.add(String(dt));
        }

        // Identity sets
        if (isTruthy(e.anon_id)) anonSet.add(String(e.anon_id));
        if (isTruthy(e.session_id)) sessionSet.add(String(e.session_id));
        if (isTruthy(e.ip)) ipSet.add(String(e.ip));
      }

      if (isOnline) activeUsers++;

      // 2. Increment User-based Interaction Counts
      userModels.forEach((m) => {
        modelCounts.set(m, (modelCounts.get(m) || 0) + 1);
      });
      userDevices.forEach((d) => {
        deviceCounts.set(d, (deviceCounts.get(d) || 0) + 1);
      });

      // 3. User-level Attributes (Traffic, ISP, Location) - Based on First or Best available
      
      // Traffic
      trafficCounts[inf.traffic] = (trafficCounts as any)[inf.traffic] + 1;

      // Referrer
      const refLabel = referrerLabelFromFirstEvent(first);
      referrerCounts.set(refLabel, (referrerCounts.get(refLabel) || 0) + 1);

      // 3. Campaign (All Sources) - Count EVERYTHING so user sees context
      let campaign = inf.campaign;
      if (!campaign) {
          if (inf.traffic === "paid") campaign = "Google Ads";
          else if (inf.traffic === "referral") campaign = inf.refName || "Referral";
          else if (inf.traffic === "direct") campaign = "Direct";
          else campaign = "Organic";
      }
      
      const prev = campaignCounts.get(campaign) || { count: 0, conversions: 0 };
      prev.count += 1;
      
      // Check conversions in entire session
      const hasConversion = evs.some((r) => {
          const en = String(r.event_name || "").toLowerCase();
          return en === "whatsapp_click" || en === "phone_click";
      });
      if (hasConversion) prev.conversions += 1;
      campaignCounts.set(campaign, prev);


      // ISP
      const firstIsp = evs.find((r) => isTruthy(r.isp))?.isp;
      if (firstIsp) {
        ispCounts.set(String(firstIsp), (ispCounts.get(String(firstIsp)) || 0) + 1);
      }

      // Location
      const locRow = evs.find(
        (r) => isTruthy(r.city) || isTruthy(r.region) || isTruthy(r.country)
      );
      if (locRow) {
         // Collect recent GPS for table
         const latestLoc = evs.slice().reverse().find(r => isTruthy(r.exact_address) || isTruthy(r.city));
         if (latestLoc) {
            gpsEvents.push({
               created_at: latestLoc.created_at,
               parsed: {
                 city: latestLoc.city || '',
                 region: latestLoc.region || '',
                 postcode: ''
               },
               exact_address: latestLoc.exact_address || ''
            });
         }
      }
      const city = String(locRow?.city || "").trim();
      const region = String(locRow?.region || "").trim();
      const country = String(locRow?.country || "").trim();
      const loc = [city, region, country].filter(Boolean).join(", ") || "Unknown";
      locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);

      // 4. Hit-based Stats (Page Views, Clicks)
      for (const r of evs) {
        const en = String(r.event_name || "").toLowerCase();
        
        // Event Counts
        eventCounts.set(
          String(r.event_name || "Unknown"),
          (eventCounts.get(String(r.event_name || "Unknown")) || 0) + 1
        );

        // Path Counts: Count ALL activity on pages, not just page_view
        // This ensures that "WhatsApp Click" events populate the "Top Pages" list
        // so we know which page triggered the click.
        const pp = cleanPagePath(String(r.page_path || r.page_url || ""));
        if (pp) {
           pathCounts.set(pp, (pathCounts.get(pp) || 0) + 1);
        }

        if (en === "page_view") {
          pageViews += 1;
        }
        if (en === "whatsapp_click") whatsappClicks += 1;
        if (en === "phone_click") phoneClicks += 1;
      }
    }

    const campaigns = Array.from(campaignCounts.entries())
      .map(([campaign, v]) => ({
        campaign,
        count: v.count,
        conversions: v.conversions,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
      
    // Sort and slice GPS events for the table
    const latestGps = gpsEvents
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);

    return NextResponse.json({
      ok: true,

      // identity
      activeUsers, 
      uniqueVisitors: identities.length,
      uniqueAnonIds: anonSet.size,
      uniqueSessions: sessionSet.size,
      uniqueIps: ipSet.size,

      // top-line hits
      pageViews,
      whatsappClicks,
      phoneClicks,

      // breakdowns
      traffic: trafficCounts,
      devices: toList(deviceCounts, 8, "key"),
      events: Array.from(allEventNames).map(name => ({
          key: name,
          count: eventCounts.get(name) || 0,
          isKnown: KNOWN_EVENTS.includes(name)
      })).sort((a,b) => {
          // 1. Always show KNOWN events first
          if (a.isKnown && !b.isKnown) return -1;
          if (!a.isKnown && b.isKnown) return 1;
          
          // 2. Then sort by Count Descending
          if (b.count !== a.count) return b.count - a.count;
          
          // 3. Finally Alphabetical
          return a.key.localeCompare(b.key);
      }),
      topPages: toList(pathCounts, 12, "key"),
      topModels: toList(modelCounts, 12, "key"),
      topReferrers: toList(referrerCounts, 10, "name"),
      topISP: toList(ispCounts, 10, "name"),
      topLocations: toList(locationCounts, 10, "name"),
      topCities: toList(locationCounts, 10, "name"), // alias for client compatibility
      
      latestGps,
      campaigns,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown" },
      { status: 500 }
    );
  }
}
