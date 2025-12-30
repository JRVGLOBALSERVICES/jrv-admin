import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
      country: (j.country || null) as string | null,
      region: (j.region || j.state || null) as string | null,
      city: (j.city || null) as string | null,
    };
  } catch {
    return null;
  }
}

function mustAuth(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const expected = process.env.CRON_SECRET || "";
  if (!expected) return true;
  return token !== expected;
}

async function fetchMissing(limit: number) {
  const { data, error } = await supabaseAdmin
    .from("site_events")
    .select("id, ip, country, region, city")
    .or("country.is.null,region.is.null,city.is.null")
    .not("ip", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as {
    id: string;
    ip: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
  }[];
}

async function updateRows(
  updates: {
    id: string;
    country: string | null;
    region: string | null;
    city: string | null;
  }[]
) {
  if (!updates.length) return 0;

  const { error } = await supabaseAdmin
    .from("site_events")
    .upsert(updates, { onConflict: "id" });

  if (error) throw new Error(error.message);
  return updates.length;
}

export async function GET(req: Request) {
  try {
    if (mustAuth(req)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") || "300"), 1),
      1500
    );

    const rows = await fetchMissing(limit);

    const ips = new Set<string>();
    for (const r of rows) {
      const ip = cleanIp(r.ip);
      if (ip) ips.add(ip);
      if (ips.size >= 400) break;
    }

    const ipGeo = new Map<
      string,
      { country: string | null; region: string | null; city: string | null }
    >();

    await Promise.all(
      Array.from(ips).map(async (ip) => {
        const g = await geoLookup(ip);
        if (g) ipGeo.set(ip, g);
      })
    );

    const updates: {
      id: string;
      country: string | null;
      region: string | null;
      city: string | null;
    }[] = [];

    for (const r of rows) {
      const ip = cleanIp(r.ip);
      const g = ipGeo.get(ip);

      const country = r.country || g?.country || null;
      const region = r.region || g?.region || null;
      const city = r.city || g?.city || null;

      if (country !== r.country || region !== r.region || city !== r.city) {
        updates.push({ id: r.id, country, region, city });
      }
    }

    const written = await updateRows(updates);

    return NextResponse.json({
      ok: true,
      scanned: rows.length,
      uniqueIps: ips.size,
      updates: written,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
