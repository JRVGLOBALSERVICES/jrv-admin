import type { SiteEventRow } from "@/app/admin/site-events/_components/types";

/* =======================================
   1. TRAFFIC CLASSIFICATION (STRICT)
   ======================================= */
export function classifyTraffic(
  row: SiteEventRow
): "Paid" | "Organic" | "Direct" | "Referral" {
  const url = (row.page_url || "").toLowerCase();
  const ref = (row.referrer || "").toLowerCase();
  const utmMedium = (row.utm_medium || "").toLowerCase();

  // 1. Strict Paid Check (Query Params)
  const isPaidParam =
    url.includes("gad_source=") ||
    url.includes("gclid=") ||
    url.includes("gbraid=") ||
    url.includes("wbraid=") ||
    url.includes("fbclid=") ||
    utmMedium.includes("cpc") ||
    utmMedium.includes("paid");

  if (isPaidParam) return "Paid";

  // 2. Organic Check (Search Engines)
  if (
    ref.includes("google.") ||
    ref.includes("bing.") ||
    ref.includes("yahoo.") ||
    ref.includes("duckduckgo")
  ) {
    return "Organic";
  }

  // 3. Referral vs Direct
  if (!ref || ref.includes(url.split("/")[2] || "jrvservices.co")) {
    // Internal or empty
    return "Direct";
  }

  return "Referral";
}

/* =======================================
   2. MODEL EXTRACTION (CLEAN)
   ======================================= */
const MODEL_BLACKLIST = new Set([
  "ads",
  "promotion",
  "promo",
  "search",
  "admin",
  "login",
  "register",
  "dashboard",
  "analytics",
  "undefined",
  "null",
  "api",
  "static",
  "media",
  "public",
  "assets",
  "favicon",
  "manifest",
]);

function safeParseProps(p: any) {
  if (!p) return {};
  if (typeof p === "object") return p;
  try {
    return JSON.parse(p);
  } catch {
    return {};
  }
}

function humanizeSlug(slug: string) {
  if (!slug) return null;
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase()) // Title Case
    .trim();
}

export function extractModelKey(row: SiteEventRow): string | null {
  const props = safeParseProps(row.props);

  // A. Try Explicit Props
  const make = String(props?.make || "").trim();
  const model = String(props?.model || "").trim();
  if (model) {
    if (MODEL_BLACKLIST.has(model.toLowerCase())) return null;
    return make ? `${make} ${model}` : model;
  }

  // B. Try Slug in Props
  if (props?.slug && !MODEL_BLACKLIST.has(props.slug.toLowerCase())) {
    return humanizeSlug(props.slug);
  }

  // C. Try URL Path (Fallback)
  // Matches /cars/perodua-bezza/ or /kereta-sewa-senawang/ (if car related)
  const path = row.page_path || "";
  if (path.startsWith("/cars/")) {
    const slug = path.replace("/cars/", "").replace(/\/$/, "");
    if (!MODEL_BLACKLIST.has(slug.toLowerCase())) {
      return humanizeSlug(slug);
    }
  }

  return null;
}

/* =======================================
   3. LOCATION PARSING (MALAYSIA OPTIMIZED)
   ======================================= */
export function parseAddress(fullAddress: string | null) {
  if (!fullAddress)
    return { city: "Unknown", region: "Unknown", country: "Unknown" };

  // Remove Plus Codes (e.g. "VJV6+HM")
  const cleaned = fullAddress.replace(/^[A-Z0-9]+\+[A-Z0-9]+\s+/i, "").trim();
  const parts = cleaned
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0)
    return { city: "Unknown", region: "Unknown", country: "Unknown" };

  // Country is usually last
  let country = parts[parts.length - 1];
  if (country.toUpperCase() === "MY" || country.toUpperCase() === "MALAYSIA")
    country = "Malaysia";

  let region = "Unknown";
  let city = "Unknown";

  // New Strategy: Precise Location
  // Keep the first part as "City" (often neighborhood) if it's not the country
  // Keep the second-to-last part as "Region" (State)

  if (parts.length === 1) {
    city = parts[0];
  } else {
    // General structure: [Specific, ..., State, Country]
    // Region = 2nd to last (if length >= 2)
    // City = First part (Most precise)

    region = parts[parts.length - 2].replace(/\d{5}/g, "").trim(); // Remove postcode from state if present

    // City is the first component, but clean postcodes
    let precise = parts[0];
    precise = precise.replace(/^\d{5}\s+/, "").replace(/\s+\d{5}$/, "");

    // If we have more detail (e.g. "Taman Foo, Bar City, State, Country"), maybe combine?
    // User said "Update cities to match precise locations".
    // Let's stick to the most specific part (index 0).
    city = precise;

    // Edge case: if city is same as region, try next part? No, usually distinct.
  }

  return { city, region, country };
}
