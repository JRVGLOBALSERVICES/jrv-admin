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
  "page_view",
  "whatsapp_click",
  "phone_click",
  "session_start",
  "click",
  "submit",
  "form_submit",
  "file_download",
  "scroll",
  "view_search_results",
  "car_image_click",
  "consent_granted",
  "consent_rejected",
  "filter_click",
  "location_consent_denied",
  "location_consent_granted",
  "model_click",
  "view_car",
  "view_details",
];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    let from = url.searchParams.get("from") || "";
    let to = url.searchParams.get("to") || "";

    // 🚀 STRENGTHEN TIMEZONES: Ensure from/to are KL 06:00 boundaries
    // If the string is just "2026-01-12", convert it.
    // If it has "T06:00:00+08:00", it's already perfect from SiteEventsFilters.
    const normalizeToKl6amStr = (val: string, isEnd = false) => {
      if (!val) return val;
      if (val.includes("T")) {
        // trust specific ISO strings with offsets
        return val;
      }
      // If it's a date only "2026-01-12"
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const d = new Date(val); // will be UTC midnight
        // If it's the end date, we actually want NEXT day 06:00 (exclusive boundary)
        if (isEnd) {
          const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
          const y = next.getUTCFullYear();
          const m = String(next.getUTCMonth() + 1).padStart(2, "0");
          const day = String(next.getUTCDate()).padStart(2, "0");
          return `${y}-${m}-${day}T06:00:00+08:00`;
        }
        return `${val}T06:00:00+08:00`;
      }
      return val;
    };

    from = normalizeToKl6amStr(from);
    to = normalizeToKl6amStr(to, true);

    const event = (url.searchParams.get("event") || "").trim();
    const traffic = (url.searchParams.get("traffic") || "").trim();
    const device = (url.searchParams.get("device") || "").trim();
    const path = (url.searchParams.get("path") || "").trim();
    const model = (url.searchParams.get("model") || "").trim();
    const plate = (url.searchParams.get("plate") || "").trim();

    if (!from || !to) {
      return NextResponse.json(
        { ok: false, error: "Missing from/to" },
        { status: 400 }
      );
    }

    // Parallel fetch:
    // 4. Realtime Active Users independent of range
    const activeThresholdDate = new Date(Date.now() - 5 * 60 * 1000);

    // 🚀 DEEP DATA FETCHING: Bypassing Supabase 1,000-row limit
    async function fetchAllInWindow(table: string, filter: any) {
      let all: any[] = [];
      let page = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabaseAdmin
          .from(table)
          .select("*")
          .gte("created_at", from)
          .lte("created_at", to)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (table === "site_events") {
          query = query
            .not("page_url", "ilike", "%localhost%")
            .neq("event_name", "heartbeat");
          if (filter?.gpsOnly) {
            query = query.not("exact_address", "is", null);
          }
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        all = [...all, ...data];
        if (data.length < PAGE_SIZE) hasMore = false;
        page++;
        // Safety cap at 50k for now to avoid heap issues, though 20k is total records
        if (all.length > 50000) break;
      }
      return { data: all };
    }

    const [mainRes, gpsRes, carsRes, landingPagesRes, realtimeRes] =
      await Promise.all([
        fetchAllInWindow("site_events", {}),
        fetchAllInWindow("site_events", { gpsOnly: true }),

        supabaseAdmin
          .from("cars")
          .select("id, catalog_id, car_catalog:catalog_id(make, model)"),

        supabaseAdmin
          .from("landing_pages")
          .select("slug, title, menu_label")
          .neq("status", "deleted"),

        supabaseAdmin
          .from("site_events")
          .select("anon_id")
          .gte("created_at", activeThresholdDate.toISOString())
          .not("page_url", "ilike", "%localhost%"),
      ]);

    // Calculate Realtime Users (approx by distinct anon_id or just raw count? Active Users usually Unique)
    // The previous logic was:
    // if (new Date(e.created_at).getTime() >= activeThreshold) isOnline = true;
    // activeUsers++; (Counts users who have at least one event in window)
    //
    // So for independent query:
    // We need to fetch rows and count distinct anon_id.
    // Or just fetch all rows (small window) and count in code.
    // Realtime rows in 5 mins is small.

    // Let's refetch Realtime properly
    // ...

    // Process Realtime Active Users
    let realtimeActiveUsers = 0;
    if (realtimeRes.data) {
      const uniqueRealtime = new Set(
        realtimeRes.data.map((r: any) => r.anon_id).filter(Boolean)
      );
      realtimeActiveUsers = uniqueRealtime.size;
    }

    // Errors are already thrown inside the fetch helpers or Promise.all if anything rejects

    // Cache car slugs for mapping
    const carSlugMap = new Map<string, string>();
    (carsRes.data || []).forEach((c: any) => {
      const make = c.car_catalog?.make || "";
      const model = c.car_catalog?.model || "";
      if (make && model) {
        // Lowercase for robust mapping regardless of URL casing
        const slug = `${make.replace(/\s+/g, "-")}-${model.replace(
          /\s+/g,
          "-"
        )}`.toLowerCase();
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
    // Merge main events and GPS events, then deduplicate by ID
    const baseRaw = [...(mainRes.data || []), ...(gpsRes?.data || [])];
    const baseMap = new Map<string, any>();
    baseRaw.forEach((r) => {
      if (r.id) baseMap.set(r.id, r);
    });
    const base = Array.from(baseMap.values());

    // Process Event Names (Merge into a set for the dropdown options)
    const allEventNames = new Set<string>();

    // Add Known Events first
    KNOWN_EVENTS.forEach((e: string) => allEventNames.add(e));

    (base || []).forEach((r: any) => {
      if (r.event_name) allEventNames.add(String(r.event_name));
    });

    // Filter out localhost
    const filteredBase = base.filter((r: any) => {
      const url = String(r.page_url || r.page_path || "").toLowerCase();
      const ref = String(r.referrer || "").toLowerCase();
      return !url.includes("localhost") && !ref.includes("localhost");
    });

    // ✅ HEAL SESSIONS: Ensure every event in a session has the best available anon_id
    const sessionToAnon = new Map<string, string>();
    const fpToAnon = new Map<string, string>();

    for (const r of filteredBase) {
      const fp = `fp_${r.ip || "unknown"}_${(r.user_agent || "").slice(0, 70)}`;
      if (isTruthy(r.session_id) && isTruthy(r.anon_id)) {
        if (!sessionToAnon.has(String(r.session_id))) {
          sessionToAnon.set(String(r.session_id), String(r.anon_id));
        }
      }
      if (isTruthy(r.anon_id)) {
        if (!fpToAnon.has(fp)) {
          fpToAnon.set(fp, String(r.anon_id));
        }
      }
    }

    // Build per-identity-day grouping
    const byIdentityDay = new Map<string, any[]>();
    const anonSet = new Set<string>();
    const sessionSet = new Set<string>();
    const ipSet = new Set<string>();

    for (const r of filteredBase) {
      // Heal the event
      const fp = `fp_${r.ip || "unknown"}_${(r.user_agent || "").slice(0, 70)}`;
      const healedAnon =
        r.anon_id ||
        (isTruthy(r.session_id)
          ? sessionToAnon.get(String(r.session_id))
          : null) ||
        fpToAnon.get(fp);

      const healedR = { ...r, anon_id: healedAnon };

      // 🚀 FORCE ADDITIVE: Identity + Business Day
      const idKey = getIdentityKey(healedR); // Already contains _bizDay from lib/site-events

      if (!byIdentityDay.has(idKey)) byIdentityDay.set(idKey, []);
      byIdentityDay.get(idKey)!.push(healedR);

      if (isTruthy(healedR.anon_id)) anonSet.add(String(healedR.anon_id));
      if (isTruthy(healedR.session_id))
        sessionSet.add(String(healedR.session_id));
      if (isTruthy(healedR.ip)) ipSet.add(String(healedR.ip));
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
    const locationCounts = new Map<string, number>(); // Legacy: City, Region
    const cityCounts = new Map<string, number>();
    const regionCounts = new Map<string, number>();
    const campaignCounts = new Map<
      string,
      { count: number; conversions: number; id?: string }
    >();

    // GPS Data
    const gpsEvents: any[] = [];
    let activeUsers = realtimeActiveUsers;

    let pageViews = 0;
    let whatsappClicks = 0;
    let phoneClicks = 0;

    const identities = Array.from(byIdentityDay.keys());

    // 1. Check for Returning Users efficiently (MOVED AFTER populating anonSet)
    const anonIdsToCheck = Array.from(anonSet).filter(
      (id) => id && id !== "null"
    );
    const returningAnonIds = new Set<string>();

    if (anonIdsToCheck.length > 0) {
      // Batch in 1000s to avoid URL length or parameter limits
      const BATCH_SIZE = 1000;
      for (let i = 0; i < anonIdsToCheck.length; i += BATCH_SIZE) {
        const batch = anonIdsToCheck.slice(i, i + BATCH_SIZE);
        const { data: returningData } = await supabaseAdmin
          .from("site_events")
          .select("anon_id")
          .in("anon_id", batch)
          .lt("created_at", from);

        (returningData || []).forEach((r: any) =>
          returningAnonIds.add(String(r.anon_id))
        );
      }
    }

    const sessions: any[] = [];
    let returningUsers = 0;

    // Identity-based aggregation
    for (const identity of identities) {
      const fullSession = byIdentityDay.get(identity) || [];
      fullSession.sort(
        (a: any, b: any) =>
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
          if (
            str.includes("gclid=") ||
            str.includes("wbraid=") ||
            str.includes("gad_source=") ||
            str.includes("gad_campaignid=")
          ) {
            return true;
          }
          return false;
        };

        const extractParams = (str: string) => {
          try {
            const parts = str.split("?");
            return parts.length > 1
              ? new URLSearchParams(parts[1])
              : new URLSearchParams(str);
          } catch (e) {
            return null;
          }
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
          } else if (
            e.referrer.includes("googleads") ||
            e.referrer.includes("doubleclick")
          ) {
            foundAd = true;
          }
        }

        if (!foundAd && e.props) {
          const p = safeParseProps(e.props);
          if (p) {
            if (
              p.gclid ||
              p.gad ||
              p.wbraid ||
              p.gbraid ||
              p.gad_source ||
              p.gad_campaignid
            ) {
              foundAd = true;
              adParams = new URLSearchParams();
              if (p.gclid) adParams.set("gclid", String(p.gclid));
              if (p.utm_campaign)
                adParams.set("utm_campaign", String(p.utm_campaign));
              if (p.gad_campaignid)
                adParams.set("gad_campaignid", String(p.gad_campaignid));
              if (p.gad_source)
                adParams.set("gad_source", String(p.gad_source));
            }
            if (!foundAd && (checkForAds(p.path) || checkForAds(p.url))) {
              foundAd = true;
              adParams = extractParams(p.path || p.url);
            }
          }
        }

        if (foundAd) {
          inf.traffic = "paid";
          if (
            inf.campaign === "Organic" ||
            inf.campaign === "Direct" ||
            inf.campaign === "Google (Organic)"
          ) {
            inf.campaign = "";
          }

          if (adParams) {
            const campaignFromParams = getCampaignFromParams(
              Object.fromEntries(adParams.entries())
            );
            if (campaignFromParams) {
              inf.campaign = campaignFromParams;
            } else if (adParams.get("gad_campaignid")) {
              inf.campaign =
                "Google Ads (ID: " + adParams.get("gad_campaignid") + ")";
            } else if (adParams.get("gad_source")) {
              inf.campaign =
                "Google Ads (Source: " + adParams.get("gad_source") + ")";
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

      // 2. Identify if session matches the filters
      const sessionMatches = (() => {
        if (traffic) {
          const t = (inf.traffic || "direct").toLowerCase();
          const want = traffic.toLowerCase();
          if (want === "paid" && t !== "paid") return false;
          if (want === "organic" && t !== "organic") return false;
          if (want === "direct" && t !== "direct") return false;
          if (want === "referral" && t !== "referral") return false;
        }

        // Check if ANY event in the session matches the specific filters
        return fullSession.some((r: any) => {
          if (event) {
            const wanted = event.split(",").map((s) => s.trim().toLowerCase());
            const en = String(r.event_name || "").toLowerCase();
            const url = String(r.page_url || r.page_path || "").toLowerCase();
            if (
              wanted.includes("whatsapp_click") &&
              en === "page_view" &&
              url.includes("walink")
            ) {
              // matched
            } else if (!wanted.includes(en)) return false;
          }
          if (device) {
            const d = getDeviceType(r.user_agent);
            if (d.toLowerCase() !== device.toLowerCase()) return false;
          }
          if (path) {
            const pp = String(r.page_path || "");
            const pu = String(r.page_url || "");
            if (!pp.includes(path) && !pu.includes(path)) return false;
          }
          if (model) {
            const mk = getModelKey(r);
            const norm = normalizeModel(mk);
            if (
              norm !== model &&
              !norm.toLowerCase().includes(model.toLowerCase())
            )
              return false;
          }
          if (plate) {
            const p = safeParseProps(r.props);
            if (p?.plate !== plate && p?.plate_number !== plate) return false;
          }
          return true;
        });
      })();

      if (!sessionMatches) continue;

      // For Lists (Sessions/GPS), we want the WHOLE session context for matching users
      const displayEvs = fullSession;

      // For Stats (Top Pages/Events), we still only count events that match the filter
      const statEvs = fullSession.filter((r: any) => {
        if (event) {
          const wanted = event.split(",").map((s) => s.trim().toLowerCase());
          const en = String(r.event_name || "").toLowerCase();
          const url = String(r.page_url || r.page_path || "").toLowerCase();
          if (
            wanted.includes("whatsapp_click") &&
            en === "page_view" &&
            url.includes("walink")
          ) {
            // matched
          } else if (!wanted.includes(en)) return false;
        }
        if (path) {
          const pp = String(r.page_path || "");
          const pu = String(r.page_url || "");
          if (!pp.includes(path) && !pu.includes(path)) return false;
        }
        // Device/Model/Plate filters are session-level, so if the session matched, all its events are valid for those filters
        return true;
      });

      const evs = displayEvs;
      const filteredForStats = statEvs;

      let isOnline = false;
      const userModels = new Set<string>();
      const userDevices = new Set<string>();

      for (const e of evs) {
        // We use realtimeActiveUsers now, so this check is redundant for count but needed for sorting/filtering online status maybe?
        // Actually we don't need isOnline for activeUsers count anymore.
        /* if (new Date(e.created_at).getTime() >= activeThreshold) {
          isOnline = true;
        } */
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

      const userAnonIds = Array.from(
        fullSession.map((s: any) => s.anon_id).filter(isTruthy)
      );
      // if (isOnline) activeUsers++; // Handled by realtime query

      const isReturning = Array.from(userAnonIds).some((id) =>
        returningAnonIds.has(String(id))
      );
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
        else if (inf.traffic === "referral")
          campaign = inf.refName || "Referral";
        else if (inf.traffic === "direct") campaign = "Direct";
        else campaign = "Organic";
      }

      const prev = campaignCounts.get(campaign) || {
        count: 0,
        conversions: 0,
        id: campaignId,
      };
      prev.count += 1;
      if (campaignId) prev.id = campaignId;

      const hasConversion = evs.some((r: any) => {
        const en = String(r.event_name || "").toLowerCase();
        return en === "whatsapp_click" || en === "phone_click";
      });
      if (hasConversion) prev.conversions += 1;
      campaignCounts.set(campaign, prev);

      const firstIsp = evs.find((r: any) => isTruthy(r.isp))?.isp;
      if (firstIsp) {
        ispCounts.set(
          String(firstIsp),
          (ispCounts.get(String(firstIsp)) || 0) + 1
        );
      }

      const normalizeLoc = (val: string) => {
        let s = String(val || "").trim();
        if (!s) return "";

        // Remove tracking artifacts like "(GPS)" or "1-A" (at start followed by space or comma)
        s = s.replace(/\s*\(GPS\)\s*/gi, "").trim();
        s = s.replace(/^[\d-]+\s*,\s*/, "").trim(); // Matches "249, " or "1-A, "
        if (/^\d+$/.test(s)) return ""; // If it's just a number, it's junk

        const low = s.toLowerCase();
        // KL Synonyms
        if (
          low.includes("kuala lumpur") ||
          low === "kl" ||
          low.includes("wilayah persekutuan") ||
          low.includes("federal territory")
        ) {
          return "Kuala Lumpur";
        }
        if (low.includes("jakarta")) return "Jakarta";
        if (low.includes("putrajaya")) return "Putrajaya";
        if (low.includes("selangor")) return "Selangor";
        if (low.includes("negeri sembilan")) return "Negeri Sembilan";
        if (low.includes("jkt utara")) return "Jakarta Utara";
        if (low.includes("penang") || low.includes("pulau pinang"))
          return "Penang";
        if (low.includes("malacca") || low.includes("melaka")) return "Melaka";
        if (low.includes("johor bahru")) return "Johor Bahru";

        // Remove trailing postcodes like "Jakarta 14250"
        return s.replace(/\s+\d{5,6}$/, "").trim();
      };

      const parseAddress = (addr: string) => {
        if (!addr) return null;
        // 1. Clean Plus Codes (e.g. PXRH+Q4)
        const clean = addr.replace(/[A-Z0-9]{4,8}\+[A-Z0-9]{2,}\b/g, "").trim();

        // 2. Try Postcode pattern: "70300 Seremban, Negeri Sembilan"
        const postcodeRegex = /\b(\d{5})\s+([^,]+),\s*([^,]+)/;
        const postcodeMatch = clean.match(postcodeRegex);
        if (postcodeMatch) {
          return {
            city: normalizeLoc(postcodeMatch[2]),
            region: normalizeLoc(postcodeMatch[3]),
          };
        }

        // 3. Fallback: Split by comma and pick parts (Country aware)
        const countryVariants = [
          "malaysia",
          "indonesia",
          "united arab emirates",
          "uae",
          "马来西亚",
          "马",
          "印尼",
        ];
        const parts = clean
          .split(",")
          .map((p) => p.trim())
          .filter((p) => {
            if (!p) return false;
            if (countryVariants.includes(p.toLowerCase())) return false;
            return true;
          });

        if (parts.length >= 2) {
          const rIdx = parts.length - 1;
          const cIdx = parts.length - 2;
          return {
            city: normalizeLoc(parts[cIdx]),
            region: normalizeLoc(parts[rIdx]),
          };
        } else if (parts.length === 1) {
          return { city: "", region: normalizeLoc(parts[0]) };
        }
        return null;
      };

      const locRow = evs
        .slice()
        .reverse()
        .find(
          (r) => isTruthy(r.city) || isTruthy(r.region) || isTruthy(r.country)
        );

      let finalCity = "";
      let finalRegion = "";

      let lastSeenAddr = "";
      for (const e of evs) {
        if (isTruthy(e.exact_address)) {
          // Deduplicate subsequent identical addresses in the same stream
          if (e.exact_address === lastSeenAddr) continue;
          lastSeenAddr = e.exact_address!;

          const parsed = parseAddress(e.exact_address!);
          if (parsed?.city) finalCity = parsed.city;
          if (parsed?.region) finalRegion = parsed.region;

          gpsEvents.push({
            created_at: e.created_at,
            parsed: {
              city: parsed?.city || e.city || "",
              region: parsed?.region || e.region || "",
              postcode: "",
            },
            exact_address: e.exact_address,
          });
        }
      }

      // If no GPS data, fall back to IP-based location
      if (!finalCity || !finalRegion) {
        const locRow = evs
          .slice()
          .reverse()
          .find(
            (r: any) =>
              isTruthy(r.city) || isTruthy(r.region) || isTruthy(r.country)
          );
        if (!finalCity) finalCity = normalizeLoc(cleanPart(locRow?.city));
        if (!finalRegion) finalRegion = normalizeLoc(cleanPart(locRow?.region));
      }

      const loc =
        [finalCity, finalRegion].filter(Boolean).join(", ") || "Unknown";
      locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);

      if (finalCity)
        cityCounts.set(finalCity, (cityCounts.get(finalCity) || 0) + 1);
      if (finalRegion)
        regionCounts.set(finalRegion, (regionCounts.get(finalRegion) || 0) + 1);

      for (const r of filteredForStats) {
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
      const durationMs =
        new Date(last.created_at).getTime() -
        new Date(first.created_at).getTime();

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
        device: Array.from(userDevices)[0] || "Unknown",
        location: loc,
        is_returning: isReturning,
      });
    }

    const campaigns = Array.from(campaignCounts.entries()).map(
      ([campaign, v]) => ({
        campaign,
        count: v.count,
        conversions: v.conversions,
        id: v.id,
      })
    );

    const sortedCampaigns = campaigns
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const latestGps = gpsEvents.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

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
      events: Array.from(allEventNames)
        .map((name) => ({
          key: name,
          count: eventCounts.get(name) || 0,
          isKnown: KNOWN_EVENTS.includes(name),
        }))
        .sort((a, b) => {
          if (a.isKnown && !b.isKnown) return -1;
          if (!a.isKnown && b.isKnown) return 1;
          if (b.count !== a.count) return b.count - a.count;
          return a.key.localeCompare(b.key);
        }),
      topPages: toList(pathCounts, 100, "key")
        .map((p) => {
          // Dynamic Naming Logic
          const cleanKey = cleanPagePath(p.key).toLowerCase();

          let name = getPageName(p.key);
          // DB Override takes precedence
          if (landingPageMap.has(cleanKey)) {
            name = landingPageMap.get(cleanKey)!;
          }

          return {
            ...p,
            name,
          };
        })
        .filter((p) => {
          // Explicitly remove "All Cars" per user request
          const k = p.key.toLowerCase();
          if (k.includes("/cars/") && !k.match(/\/cars\/[^/]/)) return false; // This filters exactly "/cars/" or "/cars"
          if (p.name === "All Cars") return false;
          return true;
        }),
      topModels: toList(modelCounts, 50, "key").map((m) => {
        // Try to find a representative carId for this model
        // We'll search for the first car that matches this normalized model string
        let carId: string | null = null;
        const normalizedM = m.key.toLowerCase();

        for (const [slug, id] of Array.from(carSlugMap.entries())) {
          // A model "Perodua Myvi G3" matches a slug "perodua-myvi-g3"
          if (slug.replace(/-/g, " ") === normalizedM) {
            carId = id;
            break;
          }
        }

        return {
          ...m,
          carId,
        };
      }),
      topReferrers: toList(referrerCounts, 50, "key"),
      topISP: toList(ispCounts, 50, "key"),
      topLocations: toList(locationCounts, 100, "key"),
      topCities: toList(cityCounts, 100, "key"),
      topRegions: toList(regionCounts, 100, "key"),
      locations: toList(locationCounts, 100, "key"), // Key used by frontend mergeCategorical
      latestGps: latestGps.slice(0, 10000),
      campaigns: campaigns.sort((a, b) => b.count - a.count).slice(0, 50),
      sessions: sessions
        .sort(
          (a, b) =>
            new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        )
        .slice(0, 10000),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown" },
      { status: 500 }
    );
  }
}
