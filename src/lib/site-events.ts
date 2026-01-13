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
export function getIdentityKey(event: any) {
  // 🚀 ADDITIVE ANALYTICS: Every identity is now (Fingerprint + BizDay)
  // This ensures Weekly/Monthly counts are the SUM of daily unique reach.

  const dUtc = new Date(event.created_at);
  const klMs = dUtc.getTime() + 8 * 60 * 60 * 1000;
  const dKl = new Date(klMs);

  // 6 AM KL Business Day Window
  const hour = dKl.getUTCHours();
  let bizDay = dKl.toISOString().split("T")[0];
  if (hour < 6) {
    const prev = new Date(klMs - 24 * 60 * 60 * 1000);
    bizDay = prev.toISOString().split("T")[0];
  }

  // Use explicit IDs if available, else fallback to fingerprint
  // 🚀 HARMONIZED: Prioritize IP_UA fingerprint OVER session_id to avoid fragmentation from refreshes
  const fp = `fp_${event.ip || "unknown"}_${(event.user_agent || "").slice(
    0,
    70
  )}`;
  const coreId = event.anon_id || fp || event.session_id || "unknown";

  return `${coreId}_${bizDay}`;
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

export function classifyTrafficSource(
  referrer: string | null,
  url: string | null
) {
  const ref = (referrer || "").toLowerCase();
  const u = (url || "").toLowerCase();

  // 1. Google Ads / Paid (Check URL for click IDs)
  if (
    u.includes("gclid") ||
    u.includes("gbraid") ||
    u.includes("wbraid") ||
    u.includes("gad_source") ||
    u.includes("utm_medium=cpc") ||
    u.includes("utm_medium=paid") ||
    u.includes("utm_medium=ppc")
  ) {
    return "Google Ads";
  }

  // 2. Google Search Partners
  if (
    u.includes("syndicate") ||
    u.includes("utm_medium=syndicate") ||
    ref.includes("syndicatedsearch.goog")
  ) {
    return "Google Search Partners";
  }

  // 3. Social Media
  if (
    ref.includes("facebook") ||
    ref.includes("fb.com") ||
    u.includes("utm_source=fb") ||
    u.includes("utm_source=facebook")
  ) {
    return "Facebook";
  }
  if (
    ref.includes("instagram") ||
    ref.includes("ig.me") ||
    u.includes("utm_source=ig") ||
    u.includes("utm_source=instagram")
  ) {
    return "Instagram";
  }
  if (ref.includes("tiktok") || u.includes("utm_source=tiktok")) {
    return "TikTok";
  }

  // 4. Google Organic
  if (ref.includes("google.com") || ref.includes("google.com.my")) {
    return "Google Organic";
  }

  // 5. Everything else is Direct
  return "Direct";
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

  // Helper to preserve suffixes while fixing base names
  const fix = (base: string, search: string) => {
    if (lower.includes(search)) {
      // If the raw name already has more detail (like G3), keep it but fix the brand/model part
      // e.g. "myvi g3" -> "Perodua Myvi G3"
      const variant = rawName.split(/\s+/).slice(1).join(" ").trim();
      if (variant && !variant.toLowerCase().includes(search)) {
        // This is a bit complex, let's stick to a simpler "smart replace"
      }
    }
  };

  if (lower.includes("bezza")) return "Perodua Bezza";
  if (lower.includes("myvi")) {
    if (lower.includes("g3")) return "Perodua Myvi G3";
    if (lower.includes("g2")) return "Perodua Myvi G2";
    if (lower.includes("g1")) return "Perodua Myvi G1";
    return "Perodua Myvi";
  }
  if (lower.includes("axia")) {
    if (lower.includes("g3")) return "Perodua Axia G3";
    if (lower.includes("g2")) return "Perodua Axia G2";
    if (lower.includes("g1")) return "Perodua Axia G1";
    return "Perodua Axia";
  }
  if (lower.includes("alza")) {
    if (lower.includes("new")) return "Perodua Alza New";
    if (lower.includes("g2")) return "Perodua Alza G2";
    if (lower.includes("g1")) return "Perodua Alza G1";
    return "Perodua Alza";
  }
  if (lower.includes("aruz")) return "Perodua Aruz";
  if (lower.includes("ativa")) return "Perodua Ativa";
  if (lower.includes("saga")) return "Proton Saga";
  if (lower.includes("persona")) return "Proton Persona";
  if (lower.includes("exora")) return "Proton Exora";
  if (lower.includes("x50")) return "Proton X50";
  if (lower.includes("x70")) return "Proton X70";
  if (lower.includes("x90")) return "Proton X90";
  if (lower.includes("vios")) return "Toyota Vios";
  if (lower.includes("yaris")) return "Toyota Yaris";
  if (lower.includes("alphard")) return "Toyota Alphard";
  if (lower.includes("vellfire")) return "Toyota Vellfire";
  if (lower.includes("innova")) return "Toyota Innova";
  if (lower.includes("city")) {
    if (lower.includes("rs")) return "Honda City RS";
    return "Honda City";
  }
  if (lower.includes("civic")) return "Honda Civic";
  if (lower.includes("brv") || lower.includes("br-v")) return "Honda BR-V";
  if (lower.includes("crv") || lower.includes("cr-v") || lower.includes("cr v"))
    return "Honda CR-V";
  if (lower.includes("xpander")) return "Mitsubishi Xpander";
  if (lower.includes("triton")) return "Mitsubishi Triton";
  if (lower.includes("hr-v") || lower.includes("hrv") || lower.includes("hr v"))
    return "Honda HR-V";
  if (lower.includes("wr-v") || lower.includes("wrv") || lower.includes("wr v"))
    return "Honda WR-V";
  if (lower.includes("brv") || lower.includes("br-v") || lower.includes("br v"))
    return "Honda BR-V";
  if (lower.includes("preve")) return "Proton Prevé";
  if (lower.includes("iriz")) return "Proton Iriz";

  // Fallback: Title Case but keep common acronyms uppercase
  return lower
    .split(" ")
    .map((word) => {
      const w = word.toUpperCase();
      if (["G1", "G2", "G3", "RS", "VVT", "SE", "AV"].includes(w)) return w;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function getBrand(model: string) {
  const m = (model || "").toLowerCase();
  if (m.includes("perodua")) return "Perodua";
  if (m.includes("proton")) return "Proton";
  if (m.includes("toyota")) return "Toyota";
  if (m.includes("honda")) return "Honda";
  return "Others";
}

export const PAGE_NAMES: Record<string, string> = {
  "/": "Homepage",
  "/cars/": "All Cars",
  "/about/": "About Us",
  "/about-us/": "About Us",
  "/privacy-policy/": "Privacy Policy",
  "/privacy-polocy/": "Privacy Policy",
  "/contact/": "Contact Us",
  "/events/": "Our Events",
  "/how-it-works/": "How It Works",
  "/terms/": "Terms & Conditions",
  "/privacy/": "Privacy Policy",
  "/news-and-promotions/": "News & Promotions",
  "/kereta-sewa-seremban/": "Kereta Sewa Seremban",
  "/kereta-sewa-senawang/": "Kereta Sewa Senawang",
  "/kereta-sewa-nilai/": "Kereta Sewa Nilai",
  "/kereta-sewa-klia-klia2/": "Kereta Sewa KLIA/KLIA2",
  "/sewa-kereta-mewah/": "Luxury Car Rental",
  "/honda-city-rs/": "Car: Honda City RS",
  "/sewa-kereta-pelajar/": "Sewa Kereta Pelajar",
};

export function getDeviceType(ua?: string | null): string {
  if (!ua) return "Unknown";
  const low = ua.toLowerCase();
  if (
    low.includes("mobile") ||
    low.includes("android") ||
    low.includes("iphone") ||
    low.includes("ipod")
  ) {
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

export function cleanPagePath(path: string | null): string {
  if (!path) return "/";
  try {
    // Strip query params
    let p = path.split("?")[0].trim().toLowerCase();
    if (!p || p === "/" || p === "") return "/";
    // Ensure leading slash
    if (!p.startsWith("/")) p = "/" + p;
    // Ensure trailing slash for mapping consistency
    if (!p.endsWith("/")) p += "/";
    return p;
  } catch {
    return "/";
  }
}

export function getPageName(path: string | null): string {
  const p = cleanPagePath(path);
  if (p === "/") return "Homepage";

  if (PAGE_NAMES[p]) return PAGE_NAMES[p];

  // Try to match car details: /cars/brand-model/
  const carMatch = p.match(/^\/cars\/([^/]+)\/$/i);
  if (carMatch) {
    const slug = carMatch[1];
    // Decodes and replaces dashes with spaces
    // e.g. perodua-myvi-g3 -> Perodua Myvi G3
    const raw = decodeURIComponent(slug).replace(/-/g, " ").trim();
    // Title Case + Smart Caps for common variants
    return raw
      .split(" ")
      .map((word) => {
        const w = word.toUpperCase();
        if (["G1", "G2", "G3", "RS", "VVT", "SE", "AV"].includes(w)) return w;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  }

  // Return the cleaned path as fallback
  return p;
}
