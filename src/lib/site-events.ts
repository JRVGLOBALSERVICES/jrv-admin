export type SiteEventRow = {
  id: string;
  created_at: string;
  event_name: string | null;
  page_path: string | null;
  page_url: string | null;
  referrer: string | null;
  session_id: string | null;
  anon_id: string | null;
  traffic_type: string | null;
  device_type?: string | null;
  props?: any;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
};

export function safeParseProps(v: any) {
  try {
    if (!v) return {};
    if (typeof v === "object") return v;
    if (typeof v === "string") return JSON.parse(v);
    return {};
  } catch {
    return {};
  }
}

/** ✅ FIXES: Argument of type 'string | null' is not assignable to parameter of type 'string | URL'. */
export function parseUrlParams(pageUrl: string | null) {
  try {
    if (!pageUrl) return {} as Record<string, string>;
    const u = new URL(pageUrl);
    const out: Record<string, string> = {};
    u.searchParams.forEach((v, k) => (out[k] = v));
    return out;
  } catch {
    return {} as Record<string, string>;
  }
}

function isGoogleReferrer(ref: string | null) {
  if (!ref) return false;
  const r = ref.toLowerCase();
  return r.includes("google.") || r.includes("www.google.com");
}

export function hasAdsParams(pageUrl: string | null) {
  const p = parseUrlParams(pageUrl);
  return !!(p.gclid || p.gbraid || p.wbraid || p.gad_campaignid || p.gad_source);
}

export function inferTrafficTypeEnhanced(r: SiteEventRow) {
  const base = String(r.traffic_type || "").toLowerCase();

  // ✅ Force PAID if Ads params exist (even if base says organic)
  if (hasAdsParams(r.page_url)) return "paid";

  if (base === "organic" || base === "paid" || base === "referral" || base === "direct") return base;

  // fallback based on referrer
  if (!r.referrer) return "direct";
  if (isGoogleReferrer(r.referrer)) return "organic";
  return "referral";
}

/**
 * ✅ Google split:
 * - If referrer is Google AND Ads params exist → "Google Ads"
 * - If referrer is Google only → "Google (Organic)"
 */
export function referrerLabel(r: SiteEventRow) {
  const ref = r.referrer || "";
  if (!ref) return "Direct / None";

  if (isGoogleReferrer(ref)) {
    return hasAdsParams(r.page_url) ? "Google Ads" : "Google (Organic)";
  }

  try {
    const u = new URL(ref);
    const host = u.hostname.replace(/^www\./, "");
    return host || "Referral";
  } catch {
    return "Referral";
  }
}

/** car model key */
export function getModelKey(r: SiteEventRow) {
  // prefer props.make/model if you store it
  const props = safeParseProps(r.props);
  const make = String(props?.make || "").trim();
  const model = String(props?.model || "").trim();
  if (make || model) return [make, model].filter(Boolean).join(" ").trim();

  // fallback infer from /cars/<slug>
  const m = (r.page_path || "").match(/^\/cars\/([^/]+)\/?$/i);
  if (!m) return "—";
  const slug = decodeURIComponent(m[1] || "").replace(/-/g, " ").trim();
  return slug ? slug : "—";
}

/**
 * ✅ Campaign Key:
 * prefer utm_campaign if present, else gad_campaignid
 * return normalized string like:
 * - "utm:DeepavaliPromo"
 * - "gad:23410586632"
 */
export function getCampaignKeyFromUrl(pageUrl: string | null) {
  const p = parseUrlParams(pageUrl);
  const utm = (p.utm_campaign || "").trim();
  const gad = (p.gad_campaignid || "").trim();

  if (utm) return `utm:${utm}`;
  if (gad) return `gad:${gad}`;
  return "";
}

export function getCampaignKey(r: SiteEventRow) {
  // first try explicit columns if you store them
  const utmCol = String(r.utm_campaign || "").trim();
  if (utmCol) return `utm:${utmCol}`;

  // else parse from url
  return getCampaignKeyFromUrl(r.page_url) || "";
}

/** count model activity (same as your older logic) */
export function shouldCountModel(r: SiteEventRow) {
  const en = String(r.event_name || "").toLowerCase();
  const isCarDetail = !!(r.page_path || "").match(/^\/cars\/[^/]+\/?$/i);

  return (
    en === "model_click" ||
    (isCarDetail && (en === "page_view" || en === "site_load" || en === "whatsapp_click" || en === "phone_click"))
  );
}
