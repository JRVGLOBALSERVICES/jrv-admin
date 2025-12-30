// src/lib/site-events.ts

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
  props: any; // can be stringified JSON or object
};

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

export function parseUrlParams(pageUrl?: string | null) {
  try {
    if (!pageUrl) return {};
    const u = new URL(pageUrl);
    const p = u.searchParams;

    return {
      gclid: p.get("gclid") || "",
      gbraid: p.get("gbraid") || "",
      wbraid: p.get("wbraid") || "",
      gad_source: p.get("gad_source") || "",
      gad_campaignid: p.get("gad_campaignid") || "",
      gbbraid: p.get("gbbraid") || "",
      lang: p.get("lang") || "",
      utm_source: p.get("utm_source") || "",
      utm_medium: p.get("utm_medium") || "",
      utm_campaign: p.get("utm_campaign") || "",
      utm_term: p.get("utm_term") || "",
      utm_content: p.get("utm_content") || "",
    };
  } catch {
    return {};
  }
}

export function referrerName(ref?: string | null) {
  if (!ref) return "Direct";
  try {
    const u = new URL(ref);
    const host = (u.hostname || "").replace(/^www\./, "");
    return host || "Referral";
  } catch {
    // sometimes referrer stored as plain string
    return String(ref).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "Referral";
  }
}

export function inferCarFromPath(page_path: string | null) {
  if (!page_path) return null;

  // Matches:
  // /cars/Toyota-Yaris/
  // /cars/Perodua-Axia-G1/
  // /cars/Toyota-Vellfire
  const m = page_path.match(/^\/cars\/([^/]+)\/?$/i);
  if (!m) return null;

  const slug = decodeURIComponent(m[1] || "");
  const parts = slug.split("-").filter(Boolean);

  if (parts.length < 2) {
    return { make: "", model: slug.replace(/-/g, " ") };
  }
  return { make: parts[0], model: parts.slice(1).join(" ").trim() };
}

// Normalise to nice names so “Toyota-Yaris” & “Yaris” don’t become separate keys
export function normalizeModelName(make: string, model: string) {
  const raw = `${make ? make + " " : ""}${model}`.trim();
  if (!raw) return "Unknown";

  const lower = raw.toLowerCase();

  if (lower.includes("bezza")) return "Perodua Bezza";
  if (lower.includes("myvi")) return "Perodua Myvi";
  if (lower.includes("axia")) return "Perodua Axia";
  if (lower.includes("alza")) return "Perodua Alza";
  if (lower.includes("aruz")) return "Perodua Aruz";
  if (lower.includes("ativa")) return "Perodua Ativa";

  if (lower.includes("vios")) return "Toyota Vios";
  if (lower.includes("yaris")) return "Toyota Yaris";
  if (lower.includes("alphard")) return "Toyota Alphard";
  if (lower.includes("vellfire")) return "Toyota Vellfire";
  if (lower.includes("innova")) return "Toyota Innova";

  if (lower.includes("city")) return "Honda City";
  if (lower.includes("civic")) return "Honda Civic";
  if (lower.includes("brv") || lower.includes("br-v")) return "Honda BR-V";
  if (lower.includes("crv") || lower.includes("cr-v")) return "Honda CR-V";

  // Title Case fallback
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function inferTrafficTypeEnhanced(row: {
  traffic_type?: string | null;
  referrer?: string | null;
  page_url?: string | null;
}) {
  const base = String(row.traffic_type || "").toLowerCase();
  const params = parseUrlParams(row.page_url);

  // ✅ Google Ads click IDs → treat as PAID
  const hasAdsId = !!(
    params.gclid ||
    params.gbraid ||
    params.wbraid ||
    params.gad_campaignid ||
    params.gad_source
  );

  if (hasAdsId) return "paid";
  if (base === "paid") return "paid";

  const ref = (row.referrer || "").toLowerCase();
  if (ref.includes("google.")) return "organic";

  if (!row.referrer) return "direct";
  return "referral";
}

export function isCarDetailEvent(e: SiteEventRow) {
  return !!inferCarFromPath(e.page_path);
}

/**
 * ✅ FIX: count model activity not only model_click/page_view,
 * but ALSO whatsapp_click/phone_click because those are conversions for a model.
 */
export function shouldCountModel(e: SiteEventRow) {
  const detail = isCarDetailEvent(e);
  const name = String(e.event_name || "").toLowerCase();

  if (name === "model_click") return true;

  // car detail page views/loads count as model interest
  if (detail && (name === "page_view" || name === "site_load")) return true;

  // ✅ conversions also count toward model popularity
  if (detail && (name === "whatsapp_click" || name === "phone_click")) return true;

  return false;
}

export function getModelKey(e: SiteEventRow) {
  const props = safeParseProps(e.props);
  let make = String(props?.make || "").trim();
  let model = String(props?.model || "").trim();

  if (!model) {
    const inferred = inferCarFromPath(e.page_path);
    if (inferred?.model) {
      make = make || inferred.make || "";
      model = inferred.model;
    }
  }

  if (!model) return "Unknown";
  return normalizeModelName(make, model);
}
