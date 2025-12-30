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
  from?: string;
  to?: string;
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

function toIsoStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function toIsoEnd(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

function clampToDateInput(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function rangeToIso(rangeKey: string, from?: string, to?: string) {
  const now = new Date();

  if (rangeKey === "custom" && from && to) {
    const s = new Date(from);
    const e = new Date(to);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      return { initialFrom: toIsoStart(s), initialTo: toIsoEnd(e), rangeKey: "custom" };
    }
  }

  if (rangeKey === "7d") {
    return {
      initialFrom: new Date(now.getTime() - 7 * 864e5).toISOString(),
      initialTo: now.toISOString(),
      rangeKey: "7d",
    };
  }

  if (rangeKey === "30d") {
    return {
      initialFrom: new Date(now.getTime() - 30 * 864e5).toISOString(),
      initialTo: now.toISOString(),
      rangeKey: "30d",
    };
  }

  return {
    initialFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    initialTo: now.toISOString(),
    rangeKey: "24h",
  };
}

export default async function SiteEventsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const { initialFrom, initialTo, rangeKey } = rangeToIso(sp.range || "24h", sp.from, sp.to);

  const initialFilters: Filters = {
    event: sp.event || "",
    traffic: sp.traffic || "",
    device: sp.device || "",
    path: sp.path || "",
  };

  const filterUiFrom = rangeKey === "custom" ? (sp.from || clampToDateInput(initialFrom)) : "";
  const filterUiTo = rangeKey === "custom" ? (sp.to || clampToDateInput(initialTo)) : "";

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen space-y-4">
      <SiteEventsFilters rangeKey={rangeKey} from={filterUiFrom} to={filterUiTo} filters={initialFilters} />

      <SiteEventsClient
        initialFrom={initialFrom}
        initialTo={initialTo}
        initialRange={rangeKey}
        initialFilters={initialFilters}
      />
    </div>
  );
}
