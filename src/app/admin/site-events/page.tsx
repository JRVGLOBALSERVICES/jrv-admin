import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import SiteEventsClient from "./_components/SiteEventsClient";
import SiteEventsFilters from "./_components/SiteEventsFilters";

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

function clampToDateInput(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateOnlyToIsoStart(dateOnly: string) {
  // Server runs in UTC on Vercel; if you send ISO from client (Malaysia),
  // this is only fallback.
  const [y, m, d] = dateOnly.split("-").map((x) => Number(x));
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString();
}

function dateOnlyToIsoEnd(dateOnly: string) {
  const [y, m, d] = dateOnly.split("-").map((x) => Number(x));
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
  return dt.toISOString();
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

  if (rangeKey === "7d") {
    return {
      initialFrom: new Date(now.getTime() - 7 * 864e5).toISOString(),
      initialTo: now.toISOString(),
      rangeKey: "7d" as const,
    };
  }

  if (rangeKey === "30d") {
    return {
      initialFrom: new Date(now.getTime() - 30 * 864e5).toISOString(),
      initialTo: now.toISOString(),
      rangeKey: "30d" as const,
    };
  }

  return {
    initialFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    initialTo: now.toISOString(),
    rangeKey: "24h" as const,
  };
}

export default async function SiteEventsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

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
