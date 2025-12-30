export type SiteEventRow = {
  id: string;
  created_at: string;
  event_name: string;
  page_path: string | null;
  page_url: string | null;
  referrer: string | null;
  session_id: string | null;
  anon_id: string | null;
  traffic_type: string | null;
  device_type: string | null;
  props: any;
  ip?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
};

export type UrlParams = Record<string, string>;

export function safeParseProps(v: any): Record<string, any> {
  try {
    if (!v) return {};
    if (typeof v === "object") return v as any;
    if (typeof v === "string") return JSON.parse(v);
    return {};
  } catch {
    return {};
  }
}

export function parseUrlParams(input?: string | null): UrlParams {
  if (!input) return {};
  try {
    const base = input.startsWith("http")
      ? input
      : `https://x.local${input.startsWith("/") ? "" : "/"}${input}`;
    const u = new URL(base);
    const out: UrlParams = {};
    u.searchParams.forEach((v, k) => (out[k.toLowerCase()] = v));
    return out;
  } catch {
    const q = input.split("?")[1] || "";
    const sp = new URLSearchParams(q);
    const out: UrlParams = {};
    sp.forEach((v, k) => (out[k.toLowerCase()] = v));
    return out;
  }
}

export function normalizeReferrerHost(ref?: string | null): string {
  if (!ref) return "";
  try {
    const u = new URL(ref);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    const s = String(ref).replace(/^https?:\/\//, "");
    return (s.split("/")[0] || "").replace(/^www\./, "").toLowerCase();
  }
}

export function isGoogleHost(host: string) {
  return (
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host === "google.com.my" ||
    host.endsWith(".google.com.my") ||
    host.includes("google.")
  );
}

export function isOwnHost(host: string) {
  const h = (host || "").toLowerCase();
  return (
    h === "jrvservices.co" ||
    h === "www.jrvservices.co" ||
    h === "localhost" ||
    h.endsWith(".vercel.app")
  );
}

function deepStringify(obj: any): string {
  try {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

export function findAdsParamsSafe(r: SiteEventRow): UrlParams {
  const out: UrlParams = {};
  const take = (p: UrlParams) => {
    for (const k of [
      "gclid",
      "gbraid",
      "wbraid",
      "gad_campaignid",
      "gad_source",
      "utm_campaign",
      "utm_source",
      "utm_medium",
      "utm_id",
    ]) {
      if (p[k] && !out[k]) out[k] = p[k];
    }
  };

  const COUNTRY_MAP: Record<string, string> = {
    MY: "Malaysia",
    SG: "Singapore",
    US: "United States",
    ID: "Indonesia",
    IN: "India",
    GB: "United Kingdom",
    AU: "Australia",
    CN: "China",
    JP: "Japan",
    TH: "Thailand",
    PH: "Philippines",
    VN: "Vietnam",
  };

  function decodeMaybe(v: any) {
    const raw = String(v ?? "").trim();
    if (!raw) return "";

    try {
      // decode Santa%20Clara and also "+" (querystring style)
      return decodeURIComponent(raw.replace(/\+/g, "%20"));
    } catch {
      return raw;
    }
  }

  function normalizeCountry(v: any) {
    const s = decodeMaybe(v);
    if (!s) return "";
    const upper = s.toUpperCase().trim();

    // If ISO code, map to full name
    if (COUNTRY_MAP[upper]) return COUNTRY_MAP[upper];

    // If already a name, keep it
    return s;
  }

  function normalizeRegion(v: any) {
    const s = decodeMaybe(v);
    if (!s) return "";

    // remove numeric admin codes like "14"
    if (/^\d+$/.test(s.trim())) return "";
    return s;
  }

  function normalizeCity(v: any) {
    return decodeMaybe(v);
  }

  function formatLocation(r: any) {
    const city = normalizeCity(r?.city);
    const region = normalizeRegion(r?.region);
    const country = normalizeCountry(r?.country);

    return [city, region, country].filter(Boolean).join(", ") || "Unknown";
  }

  take(parseUrlParams(r.page_url));

  const refHost = normalizeReferrerHost(r.referrer);
  if (refHost && !isOwnHost(refHost)) {
    take(parseUrlParams(r.referrer));
  }

  const props = safeParseProps(r.props);
  const directUrl =
    props?.url ||
    props?.href ||
    props?.link ||
    props?.page_url ||
    props?.pageUrl ||
    props?.landing_url ||
    props?.landingUrl;

  take(parseUrlParams(directUrl));
  take(parseUrlParams(deepStringify(props)));

  return out;
}

export function getCampaignFromParams(p: UrlParams): string {
  const utm = p["utm_campaign"];
  const gad = p["gad_campaignid"];
  const utmId = p["utm_id"];

  if (utm && String(utm).trim()) return String(utm).trim();
  if (utmId && String(utmId).trim()) return String(utmId).trim();
  if (gad && String(gad).trim()) return `gad:${String(gad).trim()}`;
  return "";
}

export function getSessionKey(r: SiteEventRow): string {
  return r.session_id || r.anon_id || "unknown";
}

export function referrerLabelFromFirstEvent(first: SiteEventRow): string {
  const host = normalizeReferrerHost(first.referrer);
  if (!host) return "Direct / None";
  if (isGoogleHost(host)) return "Google";
  if (host.includes("facebook.")) return "Facebook";
  if (host.includes("instagram.")) return "Instagram";
  if (host.includes("tiktok.")) return "TikTok";
  return host || "Direct / None";
}

export type Acquisition = "direct" | "organic" | "paid" | "referral";

export function inferAcquisitionFromFirstEvent(first: SiteEventRow): {
  traffic: Acquisition;
  campaign: string;
  refName: string;
  adsMeta: UrlParams;
} {
  const adsMeta = findAdsParamsSafe(first);
  const campaign = getCampaignFromParams(adsMeta);
  const refHost = normalizeReferrerHost(first.referrer);

  const utmMedium = String(adsMeta.utm_medium || "").toLowerCase();
  const hasAds =
    !!adsMeta.gclid ||
    !!adsMeta.gbraid ||
    !!adsMeta.wbraid ||
    !!adsMeta.gad_campaignid ||
    !!adsMeta.gad_source ||
    utmMedium === "cpc" ||
    utmMedium === "ppc" ||
    utmMedium === "paidsearch";

  if (hasAds) {
    return {
      traffic: "paid",
      campaign: campaign || "Google Ads",
      refName: "Google Ads",
      adsMeta,
    };
  }

  if (!refHost)
    return {
      traffic: "direct",
      campaign: "",
      refName: "Direct / None",
      adsMeta,
    };

  if (isGoogleHost(refHost)) {
    return {
      traffic: "organic",
      campaign: "",
      refName: "Google (Organic)",
      adsMeta,
    };
  }

  return {
    traffic: "referral",
    campaign: "",
    refName: referrerLabelFromFirstEvent(first),
    adsMeta,
  };
}

export function getModelKey(r: SiteEventRow): string {
  const props = safeParseProps(r.props);
  const make = String(props?.make || "").trim();
  const model = String(props?.model || "").trim();
  if (make || model) return `${make} ${model}`.trim();

  const p = r.page_path || "";
  const m = p.match(/^\/cars\/([^/]+)\/?$/i);
  if (m?.[1]) {
    const slug = decodeURIComponent(m[1]);
    return slug.replace(/-/g, " ").trim() || "Unknown";
  }
  return "Unknown";
}

export function getCampaignKeyFromSession(sessionFirst: SiteEventRow): string {
  const meta = findAdsParamsSafe(sessionFirst);
  const c = getCampaignFromParams(meta);
  return c || "—";
}

export function referrerLabel(r: SiteEventRow) {
  return referrerLabelFromFirstEvent(r);
}
