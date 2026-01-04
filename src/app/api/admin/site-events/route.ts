import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SiteEventRow } from "@/lib/site-events";
import {
  getSessionKey,
  inferAcquisitionFromFirstEvent,
  safeParseProps,
  getModelKey,
} from "@/lib/site-events";

/* ===========================
   Location normalization
   =========================== */

function decodeMaybe(v: unknown) {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, "%20"));
  } catch {
    return raw;
  }
}

const COUNTRY_MAP: Record<string, string> = {
  MY: "Malaysia",
  MALAYSIA: "Malaysia",
  SG: "Singapore",
  SINGAPORE: "Singapore",
  US: "United States",
  USA: "United States",
  "UNITED STATES": "United States",
  ID: "Indonesia",
  INDONESIA: "Indonesia",
  IN: "India",
  INDIA: "India",
  GB: "United Kingdom",
  UK: "United Kingdom",
  "UNITED KINGDOM": "United Kingdom",
  AU: "Australia",
  AUSTRALIA: "Australia",
};

function normalizeCountry(v: unknown) {
  const s = decodeMaybe(v);
  if (!s) return "";
  const key = s.trim().toUpperCase();
  return COUNTRY_MAP[key] || s;
}

function normalizeRegion(v: unknown) {
  const s = decodeMaybe(v);
  if (!s) return "";
  if (/^\d+$/.test(s.trim())) return "";
  return s;
}

function normalizeCity(v: unknown) {
  return decodeMaybe(v);
}

// ✅ Parse Google Address to extract standardized location components
function parseExactAddress(addr: string | null) {
  if (!addr) return null;
  const parts = addr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const countryRaw = parts[parts.length - 1];
  const country = normalizeCountry(countryRaw);

  let region = "";
  let city = parts[0];

  if (parts.length >= 3) {
    const potentialRegion = parts[parts.length - 2];
    region = potentialRegion.replace(/\d+/g, "").trim();
    city = parts[parts.length - 3] || parts[0];
  } else if (parts.length === 2) {
    city = parts[0];
  }

  return { country, region, city };
}

// ✅ CRITICAL FIX: If exact_address is missing but we have GPS, show GPS coords
function formatLocation(
  city: string,
  region: string,
  country: string,
  exact: string | null,
  lat?: number | null,
  lng?: number | null
) {
  if (exact) {
    return exact.split(",").slice(0, 2).join(", ");
  }

  // If we have GPS data but no address, show coords to avoid "Kuala Lumpur" IP bias
  if (lat && lng) {
    return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)} (GPS)`;
  }

  return [city, region, country].filter(Boolean).join(", ") || "Unknown";
}

/* ===========================
   Query helpers
   =========================== */

function toIsoSafe(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

type Filters = {
  event?: string;
  traffic?: string;
  device?: string;
  path?: string;
};

async function fetchRows(
  fromIso: string,
  toIso: string,
  filters: Filters,
  page: number,
  limit: number
) {
  const fromIdx = (Math.max(1, page) - 1) * limit;
  const toIdx = fromIdx + limit - 1;

  let q = supabaseAdmin
    .from("site_events")
    // ✅ ADDED: lat, lng, exact_address, isp
    .select(
      "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, props, ip, country, region, city, lat, lng, exact_address, isp",
      { count: "exact" }
    )
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (filters.event) q = q.eq("event_name", filters.event);
  if (filters.traffic) q = q.eq("traffic_type", filters.traffic);
  if (filters.device) q = q.eq("device_type", filters.device);
  if (filters.path) q = q.ilike("page_path", `%${filters.path}%`);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  return { rows: (data || []) as SiteEventRow[], total: count || 0 };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to)
      return NextResponse.json(
        { ok: false, error: "Missing from/to" },
        { status: 400 }
      );

    const fromIso = toIsoSafe(from);
    const toIso = toIsoSafe(to);

    if (!fromIso || !toIso)
      return NextResponse.json(
        { ok: false, error: "Invalid from/to" },
        { status: 400 }
      );

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(
      200,
      Math.max(10, Number(url.searchParams.get("limit") || 50))
    );

    const filters: Filters = {
      event: url.searchParams.get("event") || undefined,
      traffic: url.searchParams.get("traffic") || undefined,
      device: url.searchParams.get("device") || undefined,
      path: url.searchParams.get("path") || undefined,
    };

    const { rows, total } = await fetchRows(
      fromIso,
      toIso,
      filters,
      page,
      limit
    );

    const sessionFirst = new Map<string, SiteEventRow>();
    for (const r of rows.slice().reverse()) {
      const sk = getSessionKey(r);
      if (!sessionFirst.has(sk)) sessionFirst.set(sk, r);
    }

    const sessionMeta = new Map<
      string,
      { trafficFixed: string; campaignKey: string; refName: string }
    >();

    for (const [sk, first] of sessionFirst.entries()) {
      const a = inferAcquisitionFromFirstEvent(first);
      sessionMeta.set(sk, {
        trafficFixed: a.traffic || "direct",
        campaignKey: a.campaign || "—",
        refName: a.refName || "Direct / None",
      });
    }

    const out = rows.map((r) => {
      const sk = getSessionKey(r);
      const meta = sessionMeta.get(sk);
      const propsObj = safeParseProps(r.props);

      const gpsGeo = parseExactAddress(r.exact_address || null);
      const cityNorm = gpsGeo?.city || normalizeCity((r as any).city);
      const regionNorm = gpsGeo?.region || normalizeRegion((r as any).region);
      const countryNorm =
        gpsGeo?.country || normalizeCountry((r as any).country);

      // ✅ Pass Lat/Lng to formatLocation
      const locationLabel = formatLocation(
        cityNorm,
        regionNorm,
        countryNorm,
        r.exact_address || null,
        r.lat,
        r.lng
      );

      const modelKey = getModelKey(r);

      return {
        ...r,
        propsObj,
        trafficFixed: meta?.trafficFixed || "direct",
        campaignKey: meta?.campaignKey || "—",
        refName: meta?.refName || "Direct / None",
        modelKey: modelKey || "Unknown",
        city: cityNorm || null,
        region: regionNorm || null,
        country: countryNorm || null,
        locationLabel,
        lat: r.lat,
        lng: r.lng,
        exact_address: r.exact_address,
        isp: r.isp,
      };
    });

    return NextResponse.json({ ok: true, rows: out, page, limit, total });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
