import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ========================================================================
   HELPERS
   ======================================================================== */

function safeText(v: any, max = 500): string | null {
  if (v == null) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

function safeObj(v: any) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function getIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "127.0.0.1";
}

// 1. DEVICE TYPE LOGIC
function getDeviceType(userAgent: string) {
  if (!userAgent) return "Desktop";
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "Tablet";
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)os|Opera M(obi|ini)/.test(
      ua
    )
  ) {
    return "Mobile";
  }
  return "Desktop";
}

// 2. TRAFFIC TYPE LOGIC
function getTrafficType(
  referrer: string | null,
  currentUrl: string | null,
  props: any
) {
  // Check for Paid Params
  const adParams = ["gclid", "gad_source", "gbraid", "wbraid", "utm_source"];
  const hasAdParams = adParams.some(
    (p) => (props && props[p]) || (currentUrl && currentUrl.includes(p + "="))
  );
  if (hasAdParams) return "Paid";

  // Check Referrer
  if (!referrer || referrer.trim() === "") return "Direct";

  try {
    const refHost = new URL(referrer).hostname.replace(/^www\./, "");
    const selfHost = currentUrl
      ? new URL(currentUrl).hostname.replace(/^www\./, "")
      : "";

    // Internal Navigation
    if (selfHost && refHost === selfHost) return "Direct";

    // Organic Search
    if (/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.|yandex\./.test(refHost)) {
      return "Organic";
    }

    // Social Media
    if (
      /facebook\.|instagram\.|tiktok\.|twitter\.|linkedin\.|pinterest\.|t\.co/.test(
        refHost
      )
    ) {
      return "Social";
    }

    return "Referral";
  } catch (e) {
    return "Direct";
  }
}

// 3. SERVER-SIDE GEOCODING (Fixes "Exact Address Null")
async function resolveAddressServerSide(lat: number, lng: number) {
  // Use server key (unrestricted IP) or fallback to public key
  const key =
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!key || !lat || !lng) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.results.length > 0) {
      return data.results[0].formatted_address;
    } else {
      console.error("[Track API] Geo Error:", data.status, data.error_message);
    }
  } catch (e: any) {
    console.error("[Track API] Geo Network Error:", e.message);
  }
  return null;
}

// --- Fallback IP Geo ---
async function fetchGeoFromIp(ip: string) {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168."))
    return null;

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await res.json();
    if (data.status === "success") {
      return {
        country: data.country,
        region: data.regionName,
        city: data.city,
        isp: data.isp, // ✅ Capture ISP
      };
    }
  } catch (e) {}
  return null;
}

/* ========================================================================
   MAIN POST HANDLER
   ======================================================================== */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event_name = safeText(body.event_name || body.event, 120);

    if (!event_name) {
      return NextResponse.json(
        { error: "Missing event_name" },
        { status: 400 }
      );
    }

    const props = safeObj(body.props);
    const ip = safeText(getIp(req), 120)!;
    const userAgent = safeText(req.headers.get("user-agent"), 800) || "";

    // 1. IP Geo Lookup (Default)
    let geo = {
      country: safeText(req.headers.get("x-vercel-ip-country"), 120),
      region: safeText(req.headers.get("x-vercel-ip-country-region"), 120),
      city: safeText(req.headers.get("x-vercel-ip-city"), 120),
      isp: null as string | null,
    };

    // Enhance with External Lookup if local headers fail
    if ((!geo.country || !geo.city) && ip !== "127.0.0.1" && ip !== "::1") {
      const accurate = await fetchGeoFromIp(ip);
      if (accurate) geo = { ...geo, ...accurate };
    }

    // 2. Resolve GPS Data (Exact Address Fix)
    let lat = props.lat || null;
    let lng = props.lng || null;
    let exact_address = props.exact_address || null;

    // If we have coords but no address (because browser fetch failed), fetch it now!
    if (lat && lng && !exact_address) {
      exact_address = await resolveAddressServerSide(lat, lng);
      if (exact_address) {
        // Override IP city with GPS city if possible to avoid "Kuala Lumpur" default
        geo.city = `${exact_address.split(",")[0]} (GPS)`;
      }
    }

    // 3. Traffic & Device Info
    const device_type = getDeviceType(userAgent);

    // Calculate Traffic Type
    let traffic_type = safeText(body.traffic_type, 50);
    if (!traffic_type) {
      traffic_type = getTrafficType(body.referrer, body.page_url, props);
    }

    let utm_source = safeText(body.utm_source, 120);
    let utm_medium = safeText(body.utm_medium, 120);

    // Normalize Paid Traffic params
    if (traffic_type === "Paid") {
      if (!utm_source) utm_source = "google";
      if (!utm_medium) utm_medium = "cpc";
    }

    // 4. Construct DB Row
    const insertRow = {
      event_name,
      page_path: safeText(body.page_path, 300),
      page_url: safeText(body.page_url, 800),
      referrer: safeText(body.referrer, 800),
      session_id: safeText(body.session_id, 120),
      user_id: safeText(body.user_id, 120),
      anon_id: safeText(body.anon_id, 120),

      // UTM / Ads
      utm_source,
      utm_medium,
      utm_campaign: safeText(body.utm_campaign, 200),
      utm_term: safeText(body.utm_term, 200),
      utm_content: safeText(body.utm_content, 200),

      // Calculated Fields
      traffic_type,
      device_type,
      keyword: safeText(body.keyword, 200),
      user_agent: userAgent,

      // Geo Data
      ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      isp: geo.isp, // ✅ Capture ISP

      // GPS Specifics
      exact_address,
      lat,
      lng,

      props,
    };

    // 5. Save to Supabase (Using 'site_events_test' table)
    const { error } = await supabase.from("site_events_test").insert(insertRow);

    if (error) {
      console.error("[Supabase Insert Error]:", error);
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[Track Error]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
