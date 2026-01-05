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

  // ✅ ADDED: Geo & Network columns
  lat?: number | null;
  lng?: number | null;
  exact_address?: string | null;
  isp?: string | null;
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
  return getIdentityKey(r);
}

// ✅ identity grouping rule = anon_id → session_id → ip
export function getIdentityKey(r: SiteEventRow): string {
  return (r.anon_id || r.session_id || r.ip || "unknown") as string;
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
  // Strip query string before matching to avoid capturing params as model slug
  const pNoQuery = p.split("?")[0];
  const m = pNoQuery.match(/^\/cars\/([^/]+)\/?$/i);
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

export function cleanPart(v: any) {
  const s = String(v || "").trim();
  if (!s) return "";
  try {
    const decoded = decodeURIComponent(s.replace(/\+/g, " "));
    return decoded.trim();
  } catch {
    return s;
  }
}

export function isGarbageModel(name: string) {
  if (!name) return true;
  const n = name.toLowerCase().trim();

  if (
    n.includes("gad_source") ||
    n.includes("gclid") ||
    n.includes("campaignid") ||
    n.includes("fbclid") ||
    n.includes("http") ||
    n.includes("_wcB") ||
    n.includes("gad_source") ||
    n.includes("gclid") ||
    n.includes("campaignid") ||
    n.includes("fbclid") ||
    n.includes("http") ||
    n.includes("_wcB") ||
    n.includes("w8s") ||
    n.includes("location=") ||
    n.includes("offertoday")
  ) {
    return true;
  }
  if (n.length > 25) return true;
  if (n.includes("_")) return true;
  if (!n.includes(" ") && n.length > 15) return true;

  return false;
}

export function normalizeModel(rawName: string | null) {
  if (!rawName) return "Unknown";
  if (isGarbageModel(rawName)) return "Unknown";

  const lower = rawName.toLowerCase().trim();

  if (lower.includes("bezza")) return "Perodua Bezza";
  if (lower.includes("myvi")) return "Perodua Myvi";
  if (lower.includes("axia")) return "Perodua Axia";
  if (lower.includes("alza")) return "Perodua Alza";
  if (lower.includes("aruz")) return "Perodua Aruz";
  if (lower.includes("ativa")) return "Perodua Ativa";
  if (lower.includes("saga")) return "Proton Saga";
  if (lower.includes("person")) return "Proton Persona";
  if (lower.includes("exora")) return "Proton Exora";
  if (lower.includes("x50")) return "Proton X50";
  if (lower.includes("x70")) return "Proton X70";
  if (lower.includes("x90")) return "Proton X90";
  if (lower.includes("vios")) return "Toyota Vios";
  if (lower.includes("yaris")) return "Toyota Yaris";
  if (lower.includes("alphard")) return "Toyota Alphard";
  if (lower.includes("vellfire")) return "Toyota Vellfire";
  if (lower.includes("innova")) return "Toyota Innova";
  if (lower.includes("city")) return "Honda City";
  if (lower.includes("civic")) return "Honda Civic";
  if (lower.includes("brv") || lower.includes("br-v")) return "Honda BR-V";
  if (lower.includes("crv") || lower.includes("cr-v")) return "Honda CR-V";
  if (lower.includes("xpander")) return "Mitsubishi Xpander";
  if (lower.includes("triton")) return "Mitsubishi Triton";
  if (lower.includes("hr-v") || lower.includes("hrv")) return "Honda HR-V";
  if (lower.includes("wr-v") || lower.includes("wrv")) return "Honda WR-V";
  if (lower.includes("cr-v") || lower.includes("crv")) return "Honda CR-V";
  if (lower.includes("preve")) return "Proton Prevé";
  if (lower.includes("iriz")) return "Proton Iriz";

  // Fallback: Title Case
  return lower.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getBrand(model: string) {
  const m = (model || "").toLowerCase();
  if (m.includes("perodua")) return "Perodua";
  if (m.includes("proton")) return "Proton";
  if (m.includes("toyota")) return "Toyota";
  if (m.includes("honda")) return "Honda";
  return "Others";
}

export function cleanPagePath(path: string | null): string {
  if (!path) return "Unknown";
  try {
    // Strip query params
    const noQuery = path.split("?")[0];
    // Decode URI components
    return decodeURIComponent(noQuery).trim() || "/";
  } catch {
    return path.split("?")[0] || "/";
  }
}



export function getDeviceType(ua?: string | null): string {
  if (!ua) return "Unknown";
  const low = ua.toLowerCase();
  if (low.includes("mobile") || low.includes("android") || low.includes("iphone") || low.includes("ipod")) {
    return "Mobile";
  }
  if (low.includes("ipad") || low.includes("tablet")) {
    return "Tablet";
  }
  return "Desktop";
}

export function isTruthy(v: any) {
  return v !== null && v !== undefined && String(v).trim() !== "";
}