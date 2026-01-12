import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { createSupabaseServer } from "@/lib/supabase/server";
import SiteEventsClient from "./_components/SiteEventsClient";
import SiteEventsFilters from "./_components/SiteEventsFilters";
import { rangeKeyToIso, rangeDays6amKlUtc } from "@/lib/klTimeWindow";

export const metadata: Metadata = pageMetadata({
  title: "Site Events",
  description: "GA-style analytics for JRV",
  path: "/admin/site-events",
  index: false,
});

type SP = {
  range?: string;

  // Can be ISO or YYYY-MM-DD
  from?: string;
  to?: string;

  // Optional: purely for UI prefill (YYYY-MM-DD)
  fromDate?: string;
  toDate?: string;

  event?: string;
  traffic?: string;
  device?: string;
  path?: string;
};

type Filters = {
  event: string;
  traffic: string;
  device: string;
  path: string;
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDateOnly(v?: string | null) {
  if (!v) return false;
  return DATE_ONLY_RE.test(v.trim());
}

function isIsoLike(v?: string | null) {
  if (!v) return false;
  // crude but effective: ISO timestamps have a "T"
  return v.includes("T");
}


const KL_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function clampToDateInput(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";

  // Shift to KL Time (UTC+8)
  const klTime = new Date(d.getTime() + KL_OFFSET_MS);

  // Use UTC methods on the shifted time to get the "local" KL date components
  const yyyy = klTime.getUTCFullYear();
  const mm = String(klTime.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(klTime.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateOnlyToIsoStart(dateOnly: string) {
  // fallback: interpret as KL 06:00 boundary
  const [y, m, d] = dateOnly.split("-").map((x) => Number(x));
  const kl6amMs = Date.UTC(y, m - 1, d, 6, 0, 0, 0);
  return new Date(kl6amMs - KL_OFFSET_MS).toISOString();
}

function dateOnlyToIsoEnd(dateOnly: string) {
  const start = new Date(dateOnlyToIsoStart(dateOnly));
  return new Date(start.getTime() + DAY_MS).toISOString();
}

function normalizeCustomRange(from?: string, to?: string) {
  if (!from || !to) return null;

  // Case A: already ISO (from the fixed client filters) ✅
  if (isIsoLike(from) && isIsoLike(to)) {
    const s = new Date(from);
    const e = new Date(to);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;

    let fromIso = s.toISOString();
    let toIso = e.toISOString();

    // Swap if inverted
    if (new Date(toIso).getTime() < new Date(fromIso).getTime()) {
      const tmp = fromIso;
      fromIso = toIso;
      toIso = tmp;
    }

    return {
      initialFrom: fromIso,
      initialTo: toIso,
      rangeKey: "custom" as const,
    };
  }

  // Case B: date-only fallback (YYYY-MM-DD)
  if (isDateOnly(from) && isDateOnly(to)) {
    let fromIso = dateOnlyToIsoStart(from);
    let toIso = dateOnlyToIsoEnd(to);

    if (new Date(toIso).getTime() < new Date(fromIso).getTime()) {
      const tmp = fromIso;
      fromIso = toIso;
      toIso = tmp;
    }

    return {
      initialFrom: fromIso,
      initialTo: toIso,
      rangeKey: "custom" as const,
    };
  }

  // Mixed / invalid
  return null;
}

function rangeToIso(rangeKey: string, from?: string, to?: string) {
  const now = new Date();

  if (rangeKey === "custom") {
    const custom = normalizeCustomRange(from, to);
    if (custom) return custom;
  }

  // ✅ 24h / 7d / 30d are all aligned to KL 06:00 boundaries
  return rangeKeyToIso(rangeKey || "24h", now);
}

export default async function SiteEventsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const KNOWN_EVENTS = [
    "page_view", "whatsapp_click", "phone_click", "session_start", "click", "submit",
    "form_submit", "file_download", "scroll", "view_search_results",
    "car_image_click", "consent_granted", "consent_rejected", "filter_click",
    "location_consent_denied", "location_consent_granted", "model_click",
    "view_car", "view_details"
  ];

  const supabase = await createSupabaseServer();
  const { data: evRows } = await supabase
    .from("site_events")
    .select("event_name")
    .limit(50000); // Increased limit to capture all types

  const distinctEvents = new Set(KNOWN_EVENTS);
  (evRows || []).forEach((r: any) => {
    if (r.event_name) distinctEvents.add(String(r.event_name).trim());
  });

  const eventOptions = Array.from(distinctEvents).sort();

  const { initialFrom, initialTo, rangeKey } = rangeToIso(
    sp.range || "24h",
    sp.from,
    sp.to
  );

  const initialFilters: Filters = {
    event: sp.event || "",
    traffic: sp.traffic || "",
    device: sp.device || "",
    path: sp.path || "",
  };

  /**
   * UI Prefill rules:
   * - Prefer fromDate/toDate if present (YYYY-MM-DD)
   * - Else if sp.from/sp.to are date-only, use them
   * - Else derive from computed initialFrom/initialTo
   */
  const filterUiFrom =
    rangeKey === "custom"
      ? sp.fromDate ||
      (isDateOnly(sp.from) ? sp.from! : clampToDateInput(initialFrom))
      : "";

  const filterUiTo =
    rangeKey === "custom"
      ? sp.toDate || (isDateOnly(sp.to) ? sp.to! : clampToDateInput(initialTo))
      : "";

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen space-y-4">
      <SiteEventsFilters
        rangeKey={rangeKey}
        from={filterUiFrom}
        to={filterUiTo}
        filters={initialFilters}
        eventOptions={eventOptions}
      />

      <SiteEventsClient
        initialFrom={initialFrom}
        initialTo={initialTo}
        initialRange={rangeKey}
        initialFilters={initialFilters}
      />
    </div>
  );
}
