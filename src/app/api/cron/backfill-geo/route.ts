import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";

type SiteEventRowLite = {
  id: string;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
};

type Geo = { country: string; region: string; city: string };

function cleanIp(raw?: string | null) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const first = s.split(",")[0]?.trim() || "";
  return first.replace(/:\d+$/, ""); // remove :port
}

function isPrivateIp(ip: string) {
  if (!ip) return true;
  if (ip === "::1") return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const n = Number(ip.split(".")[1] || "0");
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

async function lookupIpInfo(ip: string, token: string) {
  const url = `https://ipinfo.io/${encodeURIComponent(ip)}?token=${encodeURIComponent(
    token
  )}`;
  const res = await fetch(url, { cache: "no-store" });

  let json: any = null;
  try {
    json = await res.json();
  } catch {}

  if (!res.ok) return { ok: false as const, status: res.status, json };

  const city = String(json?.city || "").trim();
  const region = String(json?.region || "").trim();
  const country = String(json?.country || "").trim(); // e.g. MY, US

  if (!city || !region || !country) {
    return { ok: false as const, status: res.status, json };
  }

  return { ok: true as const, status: res.status, geo: { city, region, country } as Geo };
}

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.IPINFO_TOKEN || "";
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing IPINFO_TOKEN env var" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit") || 300)));
  const dryRun = url.searchParams.get("dry") === "1";

  // rows missing any geo fields
  const { data, error } = await supabaseAdmin
    .from("site_events")
    .select("id, ip, country, region, city")
    .or("country.is.null,country.eq.,region.is.null,region.eq.,city.is.null,city.eq.")
    .not("ip", "is", null)
    .neq("ip", "")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data || []) as SiteEventRowLite[];

  // unique public IPs only
  const ips = Array.from(
    new Set(
      rows
        .map((r) => cleanIp(r.ip))
        .filter((ip) => ip && !isPrivateIp(ip))
    )
  );

  const geoCache = new Map<string, Geo | null>();

  let updates = 0;
  let lookupFailed = 0;
  let updateFailed = 0;
  let skippedNoGeo = 0;

  const sampleFailures: any[] = [];

  // lookup once per IP
  for (const ip of ips) {
    const r = await lookupIpInfo(ip, token);
    if (!r.ok) {
      geoCache.set(ip, null);
      lookupFailed++;
      if (sampleFailures.length < 5) {
        sampleFailures.push({ ip, status: r.status, json: r.json });
      }
      continue;
    }
    geoCache.set(ip, r.geo);
  }

  if (!dryRun) {
    for (const row of rows) {
      const ip = cleanIp(row.ip);
      if (!ip || isPrivateIp(ip)) continue;

      const geo = geoCache.get(ip);
      if (!geo) {
        skippedNoGeo++;
        continue;
      }

      const next = {
        country: row.country?.trim() ? row.country : geo.country,
        region: row.region?.trim() ? row.region : geo.region,
        city: row.city?.trim() ? row.city : geo.city,
      };

      const { error: upErr } = await supabaseAdmin
        .from("site_events")
        .update(next)
        .eq("id", row.id);

      if (upErr) {
        updateFailed++;
        if (sampleFailures.length < 5) {
          sampleFailures.push({ id: row.id, ip, updateError: upErr.message });
        }
      } else {
        updates++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    uniqueIps: ips.length,
    updates,
    lookupFailed,
    updateFailed,
    skippedNoGeo,
    dryRun,
    sampleFailures,
  });
}
