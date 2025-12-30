// src/lib/site-events.ts

export type SiteEventRow = {
  id: string;
  created_at: string;

  event_name: string | null;

  page_path: string | null;
  page_url: string | null;

  referrer: string | null;

  session_id: string | null;
  anon_id: string | null;

  traffic_type: string | null; // whatever you stored

  device_type: string | null;

  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;

  ip?: string | null;

  // ✅ IMPORTANT: you already have these columns
  country?: string | null;
  region?: string | null;
  city?: string | null;

  props: any;
};

export type UrlParams = Record<string, string>;

export function safeParseProps(v: any): Record<string, any> {
  try {
    if (!v) return {};
    if (typeof v === "object") return v;
    if (typeof v === "string") return JSON.parse(v);
    return {};
  } catch {
    return {};
  }
}

export function parseUrlParams(urlLike?: string | null): UrlParams {
  const s = String(urlLike || "").trim();
  if (!s) return {};
  try {
    // supports relative "/path?x=y"
    const u = s.startsWith("http") ? new URL(s) : new URL(s, "https://dummy.local");
    const out: UrlParams = {};
    u.searchParams.forEach((v, k) => (out[k] = v));
    return out;
  } catch {
    // fallback: manually parse "?a=b"
    const qIndex = s.indexOf("?");
    if (qIndex === -1) return {};
    const q = s.slice(qIndex + 1);
    const out: UrlParams = {};
    for (const part of q.split("&")) {
      const [k, v] = part.split("=");
      if (!k) continue;
      out[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
    return out;
  }
}

function hostFromUrl(s?: string | null) {
  const v = String(s || "").trim();
  if (!v) return "";
  try {
    const u = new URL(v.startsWith("http") ? v : `https://${v.replace(/^\/+/, "")}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return v.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
  }
}

export function referrerLabel(r: Pick<SiteEventRow, "referrer" | "page_url">): string {
  const ref = String(r.referrer || "").trim();

  if (!ref) return "Direct / None";
  const host = hostFromUrl(ref);

  // normalize common sources
  if (host.includes("google.")) return "Google";
  if (host.includes("facebook.") || host === "m.facebook.com" || host === "l.facebook.com") return "Facebook";
  if (host.includes("instagram.")) return "Instagram";
  if (host.includes("tiktok.")) return "TikTok";
  if (host.includes("bing.")) return "Bing";
  if (host.includes("yahoo.")) return "Yahoo";

  return host || "Referral";
}

export function isGoogleAdsHit(r: Pick<SiteEventRow, "page_url" | "referrer" | "props" | "utm_medium">) {
  const p1 = parseUrlParams(r.page_url);
  const p2 = parseUrlParams(r.referrer);

  const props = safeParseProps(r.props);

  // also search inside props.url / props.href if they contain query strings
  const deepUrls: string[] = [];
  if (props?.url) deepUrls.push(String(props.url));
  if (props?.href) deepUrls.push(String(props.href));
  if (props?.page_url) deepUrls.push(String(props.page_url));
  if (props?.referrer) deepUrls.push(String(props.referrer));

  let p3: UrlParams = {};
  for (const u of deepUrls) {
    const x = parseUrlParams(u);
    if (Object.keys(x).length) {
      p3 = { ...p3, ...x };
    }
  }

  const merged = { ...p1, ...p2, ...p3 };

  const hasAds =
    !!merged.gclid ||
    !!merged.gbraid ||
    !!merged.wbraid ||
    !!merged.gad_campaignid ||
    !!merged.gad_source ||
    String(r.utm_medium || "").toLowerCase().includes("cpc");

  return { hasAds, params: merged };
}

export function inferTrafficTypeEnhanced(r: SiteEventRow): "direct" | "organic" | "paid" | "referral" {
  // if you already stored traffic_type, respect it but re-check paid signals
  const base = String(r.traffic_type || "").toLowerCase();

  const { hasAds } = isGoogleAdsHit(r);

  if (hasAds) return "paid";

  const ref = referrerLabel(r);
  if (ref === "Direct / None") return "direct";

  // google but not ads -> organic
  if (ref === "Google") return "organic";

  // social/search etc treat as referral unless your logic wants "organic"
  return "referral";
}

export function shouldCountModel(r: SiteEventRow): boolean {
  const en = String(r.event_name || "").toLowerCase();
  const isCarDetail = !!String(r.page_path || "").match(/^\/cars\/[^/]+\/?$/i);

  return (
    en === "model_click" ||
    en === "whatsapp_click" ||
    en === "phone_click" ||
    (isCarDetail && (en === "page_view" || en === "site_load"))
  );
}

function inferModelFromPath(page_path?: string | null) {
  const p = String(page_path || "");
  const m = p.match(/^\/cars\/([^/]+)\/?$/i);
  if (!m) return "";
  const slug = decodeURIComponent(m[1] || "");
  return slug.replace(/-/g, " ").trim();
}

export function getModelKey(r: SiteEventRow): string {
  const props = safeParseProps(r.props);
  const make = String(props?.make || "").trim();
  const model = String(props?.model || "").trim();

  if (make || model) return `${make} ${model}`.trim() || "Unknown";
  const fromPath = inferModelFromPath(r.page_path);
  return fromPath || "Unknown";
}

// ✅ Campaign Key extraction
// Prefer utm_campaign, fallback to gad_campaignid
export function getCampaignKeyRaw(r: SiteEventRow): string {
  const utm = String(r.utm_campaign || "").trim();
  if (utm) return utm;

  const { params } = isGoogleAdsHit(r);

  const gad = String(params.gad_campaignid || "").trim();
  if (gad) return `gad:${gad}`;

  // deep search in props string
  const props = safeParseProps(r.props);
  const blob = JSON.stringify(props || {});
  const m = blob.match(/gad_campaignid=([0-9]+)/i);
  if (m?.[1]) return `gad:${m[1]}`;

  return "";
}

// ✅ Session-attributed campaign:
// if this event lacks campaign, use the session's campaign.
export function getCampaignKey(r: SiteEventRow, sessionCampaign?: string): string {
  const direct = getCampaignKeyRaw(r);
  if (direct) return direct;
  if (sessionCampaign) return sessionCampaign;
  return "—";
}
