import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SiteEventRow } from "@/lib/site-events";
import {
  getSessionKey,
  inferAcquisitionFromFirstEvent,
  getCampaignKeyFromSession,
  getModelKey,
  safeParseProps,
} from "@/lib/site-events";

function toIsoSafe(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function cleanIp(ip?: string | null) {
  if (!ip) return "";
  const s = String(ip).trim();
  if (!s) return "";
  if (s.includes(",")) return s.split(",")[0].trim();
  return s;
}

function isPublicIp(ip: string) {
  const x = String(ip || "").trim();
  if (!x) return false;
  if (x === "127.0.0.1" || x === "::1") return false;
  if (x.startsWith("10.")) return false;
  if (x.startsWith("192.168.")) return false;
  if (x.startsWith("172.")) {
    const p = Number(x.split(".")[1] || "0");
    if (p >= 16 && p <= 31) return false;
  }
  return true;
}

async function geoLookup(ip: string) {
  const safe = cleanIp(ip);
  if (!isPublicIp(safe)) return null;

  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(safe)}`, {
      cache: "no-store",
      headers: { "user-agent": "jrv-admin/1.0" },
    });
    const j: any = await r.json();
    if (!j || j.success === false) return null;
    return {
      country: j.country || null,
      region: j.region || j.state || null,
      city: j.city || null,
    };
  } catch {
    return null;
  }
}

function applyRowFilters(
  rows: SiteEventRow[],
  filters: { event?: string; device?: string; path?: string }
) {
  const ev = (filters.event || "").trim().toLowerCase();
  const dev = (filters.device || "").trim().toLowerCase();
  const p = (filters.path || "").trim().toLowerCase();

  return rows.filter((r) => {
    if (ev && String(r.event_name || "").toLowerCase() !== ev) return false;
    if (dev && String(r.device_type || "").toLowerCase() !== dev) return false;
    if (p && !String(r.page_path || "").toLowerCase().includes(p)) return false;
    return true;
  });
}

function buildSessionMeta(metaRows: SiteEventRow[]) {
  const firstBySession = new Map<string, SiteEventRow>();
  const sorted = [...metaRows].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const r of sorted) {
    const sk = getSessionKey(r);
    if (!firstBySession.has(sk)) firstBySession.set(sk, r);
  }

  const meta = new Map<
    string,
    { traffic: "direct" | "organic" | "paid" | "referral"; refName: string; campaign: string }
  >();

  for (const [sk, first] of firstBySession.entries()) {
    const acq = inferAcquisitionFromFirstEvent(first);
    const campaign =
      acq.traffic === "paid" ? getCampaignKeyFromSession(first) : "";

    meta.set(sk, {
      traffic: acq.traffic,
      refName: acq.refName || "Direct / None",
      campaign:
        acq.traffic === "paid"
          ? campaign && campaign !== "—" && campaign !== "-" ? campaign : "Google Ads"
          : "",
    });
  }

  return meta;
}

async function enrichGeo(rows: SiteEventRow[]) {
  const ipNeed = new Set<string>();
  for (const r of rows) {
    if ((!r.country || !r.region || !r.city) && r.ip) {
      const ip = cleanIp(r.ip);
      if (ip) ipNeed.add(ip);
    }
    if (ipNeed.size >= 200) break;
  }

  const ipGeo = new Map<
    string,
    { country: string | null; region: string | null; city: string | null }
  >();

  await Promise.all(
    Array.from(ipNeed).map(async (ip) => {
      const g = await geoLookup(ip);
      if (g) ipGeo.set(ip, g);
    })
  );

  return rows.map((r) => {
    const ip = cleanIp(r.ip);
    const g = ipGeo.get(ip);
    return {
      ...r,
      country: r.country || g?.country || null,
      region: r.region || g?.region || null,
      city: r.city || g?.city || null,
    } as SiteEventRow;
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") || "800"), 100),
      5000
    );

    const filterEvent = url.searchParams.get("event") || "";
    const filterTraffic = url.searchParams.get("traffic") || "";
    const filterDevice = url.searchParams.get("device") || "";
    const filterPath = url.searchParams.get("path") || "";

    const fromIso = toIsoSafe(from);
    const toIso = toIsoSafe(to);
    if (!fromIso || !toIso) {
      return NextResponse.json(
        { ok: false, error: "Invalid from/to" },
        { status: 400 }
      );
    }

    const metaFromIso = new Date(
      new Date(fromIso).getTime() - 6 * 60 * 60 * 1000
    ).toISOString();

    const [{ data: rowsRaw, error: e1 }, { data: metaRaw, error: e2 }] =
      await Promise.all([
        supabaseAdmin
          .from("site_events")
          .select(
            "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, props, ip, country, region, city"
          )
          .gte("created_at", fromIso)
          .lte("created_at", toIso)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabaseAdmin
          .from("site_events")
          .select(
            "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, props, ip, country, region, city"
          )
          .gte("created_at", metaFromIso)
          .lte("created_at", toIso)
          .order("created_at", { ascending: true })
          .limit(5000),
      ]);

    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);

    let rows = (rowsRaw || []) as SiteEventRow[];
    const metaRows = (metaRaw || []) as SiteEventRow[];

    rows = applyRowFilters(rows, {
      event: filterEvent,
      device: filterDevice,
      path: filterPath,
    });

    const sessionMeta = buildSessionMeta(metaRows);

    const rowsGeo = await enrichGeo(rows);

    const tf = (filterTraffic || "").trim().toLowerCase();

    const finalRows = rowsGeo
      .map((r) => {
        const sk = getSessionKey(r);
        const sm = sessionMeta.get(sk);

        const trafficFixed = (sm?.traffic || "direct") as
          | "direct"
          | "organic"
          | "paid"
          | "referral";

        const campaignKey =
          trafficFixed === "paid"
            ? sm?.campaign || "Google Ads"
            : trafficFixed === "organic"
            ? "Organic"
            : trafficFixed === "referral"
            ? "Referral"
            : "Direct";

        const refName =
          trafficFixed === "paid"
            ? "Google Ads"
            : sm?.refName || "Direct / None";

        const modelKey = getModelKey(r);

        const propsObj = safeParseProps(r.props);

        return {
          ...r,
          propsObj,
          trafficFixed,
          campaignKey,
          refName,
          modelKey,
        };
      })
      .filter((r: any) => {
        if (!tf) return true;
        return String(r.trafficFixed || "").toLowerCase() === tf;
      });

    return NextResponse.json({ ok: true, rows: finalRows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
