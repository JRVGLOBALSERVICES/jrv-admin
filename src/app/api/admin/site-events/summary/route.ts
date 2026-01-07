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
  classifyTrafficSource,
  cleanPart,
  PAGE_NAMES,
  getPageName,
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
    // 3. Cars for slug matching
    const [mainRes, eventsRes, carsRes, landingPagesRes] = await Promise.all([
    // ...
      supabaseAdmin
        .from("site_events")
        .select(
          "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, user_agent, props, ip, country, region, city, isp, exact_address"
        )
        .gte("created_at", from)
        .lt("created_at", to)
        .not("page_url", "ilike", "%localhost%")
        .order("created_at", { ascending: false })
        .limit(20000),
        
      supabaseAdmin
        .from("site_events")
        .select("event_name")
        .gte("created_at", from)
        .lt("created_at", to)
        .not("page_url", "ilike", "%localhost%")
        .limit(50000),

      supabaseAdmin
        .from("cars")
        .select("id, catalog_id, car_catalog:catalog_id(make, model)"),

      supabaseAdmin
        .from("landing_pages")
        .select("slug, title, menu_label")
        .neq("status", "deleted")
    ]);

    if (mainRes.error) throw mainRes.error;

    // Cache car slugs for mapping
    const carSlugMap = new Map<string, string>();
    (carsRes.data || []).forEach((c: any) => {
      const make = c.car_catalog?.make || "";
      const model = c.car_catalog?.model || "";
      if (make && model) {
        // Lowercase for robust mapping regardless of URL casing
        const slug = `${make.replace(/\s+/g, "-")}-${model.replace(/\s+/g, "-")}`.toLowerCase();
        if (!carSlugMap.has(slug)) carSlugMap.set(slug, c.id);
      }
    });

    // Cache landing page slugs
    const landingPageMap = new Map<string, string>();
    (landingPagesRes.data || []).forEach((p: any) => {
         // Normalize slug: remove leading/trailing slashes
         const safeSlug = cleanPagePath(p.slug).toLowerCase(); // standardized with slashes
         const label = p.menu_label || p.title || p.slug;
         landingPageMap.set(safeSlug, label);
    });
    
    // Process Full Data
    const base = (mainRes.data || []) as any[];

    // Process Event Names (Merge into a set for the dropdown options)
    const allEventNames = new Set<string>();
    
    // Add Known Events first
    KNOWN_EVENTS.forEach((e: string) => allEventNames.add(e));

    (eventsRes.data || []).forEach((r: any) => {
        if (r.event_name) allEventNames.add(String(r.event_name));
    });

    // Build per-identity sessions (anon_id → session_id → ip)
    const byIdentity = new Map<string, any[]>();
    const anonSet = new Set<string>();
    const sessionSet = new Set<string>();
    const ipSet = new Set<string>();

    // ✅ Group ALL fetched rows by identity first (Preserves session context)
    // Filter out localhost
    const filteredBase = base.filter((r: any) => {
      const url = String(r.page_url || r.page_path || "").toLowerCase();
      const ref = String(r.referrer || "").toLowerCase();
      return !url.includes("localhost") && !ref.includes("localhost");
    });

    for (const r of filteredBase) {
      const k = getIdentityKey(r);
      if (!byIdentity.has(k)) byIdentity.set(k, []);
      byIdentity.get(k)!.push(r);
      
      // Populate sets for uniqueness
      if (isTruthy(r.anon_id)) anonSet.add(String(r.anon_id));
      if (isTruthy(r.session_id)) sessionSet.add(String(r.session_id));
      if (isTruthy(r.ip)) ipSet.add(String(r.ip));
    }

    // Derive identity-level attributes
    const trafficCounts: Record<string, number> = {
      "Google Ads": 0,
      "Google Search Partners": 0,
      "Google Organic": 0,
      Facebook: 0,
      Instagram: 0,
      TikTok: 0,
      Direct: 0,
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
      { count: number; conversions: number; id?: string }
    >();
    
    // GPS Data
    const gpsEvents: any[] = [];
    const activeThreshold = new Date(Date.now() - 5 * 60 * 1000).getTime();
    let activeUsers = 0;

    let pageViews = 0;
    let whatsappClicks = 0;
    let phoneClicks = 0;

    const identities = Array.from(byIdentity.keys());

    // 1. Check for Returning Users efficiently (MOVED AFTER populating anonSet)
    const anonIdsToCheck = Array.from(anonSet).filter(id => id && id !== 'null').slice(0, 100);
    const returningAnonIds = new Set<string>();
    
    if (anonIdsToCheck.length > 0) {
      const { data: returningData } = await supabaseAdmin
        .from("site_events")
        .select("anon_id")
        .in("anon_id", anonIdsToCheck)
        .lt("created_at", from);
      
      (returningData || []).forEach((r: any) => returningAnonIds.add(r.anon_id));
    }

    const sessions: any[] = [];
    let returningUsers = 0;

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

      // Enhance Attribution: Scan FULL session for Ad Params
      let campaignId = "";
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
                return parts.length > 1 ? new URLSearchParams(parts[1]) : new URLSearchParams(str);
             } catch (e) { return null; }
         };

         if (checkForAds(e.page_url)) {
             foundAd = true;
             adParams = extractParams(e.page_url!);
         } else if (checkForAds(e.page_path)) {
             foundAd = true;
             adParams = extractParams(e.page_path!);
         }

         if (!foundAd && e.referrer) {
             if (checkForAds(e.referrer)) {
                 foundAd = true;
                 adParams = extractParams(e.referrer);
             } else if (e.referrer.includes("googleads") || e.referrer.includes("doubleclick")) {
                 foundAd = true;
             }
         }

         if (!foundAd && e.props) {
            const p = safeParseProps(e.props);
            if (p) {
               if (p.gclid || p.gad || p.wbraid || p.gbraid || p.gad_source || p.gad_campaignid) {
                   foundAd = true;
                   adParams = new URLSearchParams();
                   if (p.gclid) adParams.set("gclid", String(p.gclid));
                   if (p.utm_campaign) adParams.set("utm_campaign", String(p.utm_campaign));
                   if (p.gad_campaignid) adParams.set("gad_campaignid", String(p.gad_campaignid));
                   if (p.gad_source) adParams.set("gad_source", String(p.gad_source));
               }
               if (!foundAd && (checkForAds(p.path) || checkForAds(p.url))) {
                   foundAd = true;
                   adParams = extractParams(p.path || p.url);
               }
            }
         }

         if (foundAd) {
             inf.traffic = "paid";
             if (inf.campaign === "Organic" || inf.campaign === "Direct" || inf.campaign === "Google (Organic)") {
                 inf.campaign = "";
             }

             if (adParams) {
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
                campaignId = adParams.get("gad_campaignid") || "";
             } else if (!inf.campaign) {
                inf.campaign = "Google Ads";
             }
             break; 
         }
      }

      // 2. Apply Filters
      if (traffic) {
        const t = inf.traffic || "direct";
        const want = traffic.toLowerCase();
        if (want === "paid" && t !== "paid") continue;
        if (want === "organic" && t !== "organic") continue;
        if (want === "direct" && t !== "direct") continue;
        if (want === "referral" && t !== "referral") continue;
      }

      const matchingEvs = fullSession.filter(r => {
        if (event) {
             const wanted = event.split(',').map(s => s.trim().toLowerCase());
             const en = String(r.event_name || "").toLowerCase();
             const url = String(r.page_url || r.page_path || "").toLowerCase();
             
             // Fix: If explicitly filtering for whatsapp_click, allow page_views that are actually walinks
             if (wanted.includes('whatsapp_click') && en === 'page_view' && url.includes('walink')) {
                 return true;
             }
             
             if (!wanted.includes(en)) return false;
        }
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

      if (matchingEvs.length === 0) continue;
      const evs = matchingEvs;

      let isOnline = false;
      const userModels = new Set<string>();
      const userDevices = new Set<string>();

      for (const e of evs) {
        if (new Date(e.created_at).getTime() >= activeThreshold) {
          isOnline = true;
        }
        const mk = getModelKey(e);
        const clean = normalizeModel(mk);
        if (clean && clean !== "Unknown") {
          userModels.add(clean);
        }
        const dt = getDeviceType(e.user_agent) || e.device_type;
        if (isTruthy(dt)) {
          userDevices.add(String(dt));
        }
      }
      
      const userAnonIds = Array.from(fullSession.map(s => s.anon_id).filter(isTruthy));
      if (isOnline) activeUsers++;

      const isReturning = Array.from(userAnonIds).some(id => returningAnonIds.has(id));
      if (isReturning) returningUsers++;

      userModels.forEach((m) => {
        modelCounts.set(m, (modelCounts.get(m) || 0) + 1);
      });
      userDevices.forEach((d) => {
        deviceCounts.set(d, (deviceCounts.get(d) || 0) + 1);
      });

      const tSource = classifyTrafficSource(first.referrer, first.page_url);
      if (trafficCounts.hasOwnProperty(tSource)) {
        trafficCounts[tSource]++;
      } else {
        trafficCounts["Direct"]++;
      }

      const refLabel = referrerLabelFromFirstEvent(first);
      referrerCounts.set(refLabel, (referrerCounts.get(refLabel) || 0) + 1);

      let campaign = inf.campaign;
      if (!campaign) {
          if (inf.traffic === "paid") campaign = "Google Ads";
          else if (inf.traffic === "referral") campaign = inf.refName || "Referral";
          else if (inf.traffic === "direct") campaign = "Direct";
          else campaign = "Organic";
      }
      
      const prev = campaignCounts.get(campaign) || { count: 0, conversions: 0, id: campaignId };
      prev.count += 1;
      if (campaignId) prev.id = campaignId;
      
      const hasConversion = evs.some((r) => {
          const en = String(r.event_name || "").toLowerCase();
          return en === "whatsapp_click" || en === "phone_click";
      });
      if (hasConversion) prev.conversions += 1;
      campaignCounts.set(campaign, prev);

      const firstIsp = evs.find((r) => isTruthy(r.isp))?.isp;
      if (firstIsp) {
        ispCounts.set(String(firstIsp), (ispCounts.get(String(firstIsp)) || 0) + 1);
      }

      const locRow = evs.find(
        (r) => isTruthy(r.city) || isTruthy(r.region) || isTruthy(r.country)
      );
      if (locRow) {
         // Only show entries with GPS granted AND exact address
         const latestLoc = evs.slice().reverse().find(r => isTruthy(r.exact_address) && (r.event_name === 'location_consent_granted' || r.exact_address));
         if (latestLoc && isTruthy(latestLoc.exact_address)) {
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
      const city = cleanPart(locRow?.city);
      const region = cleanPart(locRow?.region);
      const loc = [city, region].filter(Boolean).join(", ") || "Unknown";
      locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);

      for (const r of evs) {
        const en = String(r.event_name || "").toLowerCase();
        
        eventCounts.set(
          String(r.event_name || "Unknown"),
          (eventCounts.get(String(r.event_name || "Unknown")) || 0) + 1
        );

        const pp = cleanPagePath(String(r.page_path || r.page_url || ""));
        const ppLower = pp.toLowerCase();
        const isWalink = ppLower.includes("walink");

        // Walink reclassification
        if (isWalink) {
             whatsappClicks += 1;
             // Attribute to the parent page so it shows in Top Pages
             // e.g. /foo/walink... -> /foo/
             const parts = ppLower.split("walink");
             const base = cleanPagePath(parts[0]);
             pathCounts.set(base, (pathCounts.get(base) || 0) + 1);
        } else {
             if (pp) {
                pathCounts.set(pp, (pathCounts.get(pp) || 0) + 1);
             }
             
             if (en === "whatsapp_click") whatsappClicks += 1;
             if (en === "page_view") pageViews += 1;
             if (en === "phone_click") phoneClicks += 1;
        }
      }

      const last = fullSession[fullSession.length - 1];
      const durationMs = new Date(last.created_at).getTime() - new Date(first.created_at).getTime();
      
      sessions.push({
        id: identity,
        anon_id: first.anon_id,
        session_id: first.session_id,
        ip: first.ip,
        start_time: first.created_at,
        duration_seconds: Math.floor(durationMs / 1000),
        event_count: evs.length,
        entry_page: getPageName(first.page_path || first.page_url),
        exit_page: getPageName(last.page_path || last.page_url),
        traffic_type: inf.traffic,
        campaign: inf.campaign,
        device: Array.from(userDevices)[0] || 'Unknown',
        location: loc,
        is_returning: isReturning
      });
    }

    const campaigns = Array.from(campaignCounts.entries())
      .map(([campaign, v]) => ({
        campaign,
        count: v.count,
        conversions: v.conversions,
        id: v.id,
      }));
      
    const sortedCampaigns = campaigns
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
      
    const latestGps = gpsEvents
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);

    return NextResponse.json({
      ok: true,
      activeUsers, 
      uniqueVisitors: identities.length,
      returningUsers,
      uniqueAnonIds: anonSet.size,
      uniqueSessions: sessionSet.size,
      uniqueIps: ipSet.size,
      pageViews,
      whatsappClicks,
      phoneClicks,
      traffic: trafficCounts,
      devices: toList(deviceCounts, 8, "key"),
      events: Array.from(allEventNames).map(name => ({
          key: name,
          count: eventCounts.get(name) || 0,
          isKnown: KNOWN_EVENTS.includes(name)
      })).sort((a,b) => {
          if (a.isKnown && !b.isKnown) return -1;
          if (!a.isKnown && b.isKnown) return 1;
          if (b.count !== a.count) return b.count - a.count;
          return a.key.localeCompare(b.key);
      }),
      topPages: toList(pathCounts, 12, "key").map(p => {
        // Dynamic Naming Logic
        const cleanKey = cleanPagePath(p.key).toLowerCase();
        
        let name = getPageName(p.key);
        // DB Override takes precedence
        if (landingPageMap.has(cleanKey)) {
             name = landingPageMap.get(cleanKey)!;
        }
        
        return {
           ...p,
           name
        };
      }).filter(p => {
          // Explicitly remove "All Cars" per user request
          const k = p.key.toLowerCase();
          if (k.includes("/cars/") && !k.match(/\/cars\/[^/]/)) return false; // This filters exactly "/cars/" or "/cars"
          if (p.name === "All Cars") return false;
          return true;
      }),
      topModels: toList(modelCounts, 12, "key").map(m => {
        // Try to find a representative carId for this model
        // We'll search for the first car that matches this normalized model string
        let carId: string | null = null;
        const normalizedM = m.key.toLowerCase();
        
        for (const [slug, id] of Array.from(carSlugMap.entries())) {
          // A model "Perodua Myvi G3" matches a slug "perodua-myvi-g3"
          if (slug.replace(/-/g, ' ') === normalizedM) {
            carId = id;
            break;
          }
        }

        return {
          ...m,
          carId
        };
      }),
      topReferrers: toList(referrerCounts, 10, "name"),
      topISP: toList(ispCounts, 10, "name"),
      topLocations: toList(locationCounts, 10, "name"),
      topCities: toList(locationCounts, 10, "name"), 
      latestGps,
      campaigns: campaigns.sort((a, b) => b.count - a.count).slice(0, 12),
      sessions: sessions.sort((a,b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).slice(0, 50),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown" },
      { status: 500 }
    );
  }
}
