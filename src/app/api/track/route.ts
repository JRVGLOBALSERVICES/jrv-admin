import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function safeText(v: any, max = 500): string | null {
  if (v == null) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

function getIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "127.0.0.1";
}

// --- 1. IP Geo Lookup ---
async function fetchGeoFromIp(ip: string) {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return null;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await res.json();
    if (data.status === "success") {
      return {
        country: data.country,
        region: data.regionName,
        city: data.city,
        isp: data.isp,
      };
    }
  } catch (e) {}
  return null;
}

// --- 2. Google Maps Server-Side Lookup ---
async function resolveAddressServerSide(lat: number, lng: number) {
  // ✅ UPDATED: Now looks for 'Maps_SERVER_KEY'
  const apiKey =
    process.env.MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!apiKey || !lat || !lng) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
  } catch (e) {
    console.error("Geo Server Error:", e);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event_name = safeText(body.event_name || body.event, 120);

    if (!event_name)
      return NextResponse.json({ error: "Missing event" }, { status: 400 });

    const ip = safeText(getIp(req), 120)!;
    const props = body.props || {};

    // A. IP Data
    let geo = {
      country: null as string | null,
      region: null as string | null,
      city: null as string | null,
      isp: null as string | null,
    };
    const accurate = await fetchGeoFromIp(ip);
    if (accurate) geo = accurate;

    // B. GPS Data & Address Resolution
    let lat = props.lat || null;
    let lng = props.lng || null;
    let exact_address = props.exact_address || null;

    if (lat && lng && !exact_address) {
      exact_address = await resolveAddressServerSide(lat, lng);
    }

    const insertRow = {
      event_name,
      page_path: safeText(body.page_path, 300),
      page_url: safeText(body.page_url, 800),
      referrer: safeText(body.referrer, 800),
      session_id: safeText(body.session_id, 120),

      ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      isp: geo.isp,

      lat,
      lng,
      exact_address,

      props,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("site_events_test").insert(insertRow);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Track Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
