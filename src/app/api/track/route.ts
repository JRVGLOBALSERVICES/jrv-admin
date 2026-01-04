import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function safeText(v: any, max = 500) {
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

async function resolveAddressServerSide(lat: number, lng: number) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key || !lat || !lng) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results.length > 0)
      return data.results[0].formatted_address;
  } catch (e) {}
  return null;
}

// ✅ HTTPS IP Lookup
async function fetchGeoFromIp(ip: string) {
  if (!ip || ip === "127.0.0.1") return null;
  try {
    const res = await fetch(`https://ipwho.is/${ip}`);
    const data = await res.json();
    if (data.success)
      return {
        country: data.country,
        region: data.region,
        city: data.city,
        isp: data.connection?.isp || data.isp,
      };
  } catch (e) {}
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event_name = safeText(body.event_name || body.event, 120);
    if (!event_name)
      return NextResponse.json(
        { error: "Missing event_name" },
        { status: 400 }
      );

    const props = safeObj(body.props);
    const ip = safeText(getIp(req), 120)!;
    const userAgent = safeText(req.headers.get("user-agent"), 800) || "";

    let geo = {
      country: safeText(req.headers.get("x-vercel-ip-country"), 120),
      region: safeText(req.headers.get("x-vercel-ip-country-region"), 120),
      city: safeText(req.headers.get("x-vercel-ip-city"), 120),
      isp: null as string | null,
    };
    if (ip !== "127.0.0.1") {
      const accurate = await fetchGeoFromIp(ip);
      if (accurate) geo = { ...geo, ...accurate };
    }

    let lat = props.lat || null;
    let lng = props.lng || null;
    let exact_address = props.exact_address || null;
    if (lat && lng && !exact_address) {
      exact_address = await resolveAddressServerSide(lat, lng);
      if (exact_address) geo.city = `${exact_address.split(",")[0]} (GPS)`;
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
      exact_address,
      lat,
      lng,
      props,
      user_agent: userAgent,
      traffic_type: safeText(body.traffic_type, 50) || "Direct",
      device_type: safeText(body.device_type, 50) || "Desktop",
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("site_events").insert(insertRow);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
