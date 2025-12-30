import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { createSupabaseServer } from "@/lib/supabase/server";
import SiteEventsClient from "./_components/SiteEventsClient";
import type { SiteEventRow } from "./_components/types";

export const metadata: Metadata = pageMetadata({
  title: "Site Events",
  description: "GA-style analytics for JRV website",
  path: "/admin/site-events",
  index: false,
});

type SearchParams = {
  from?: string;
  to?: string;
  preset?: string;
};

function isValidDate(d: any): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function rangeFromPreset(preset: string | undefined) {
  const now = new Date();
  const p = (preset || "today").toLowerCase();

  if (p === "24h") return { from: new Date(now.getTime() - 24 * 3600 * 1000), to: now };
  if (p === "7d") return { from: startOfDay(new Date(now.getTime() - 7 * 24 * 3600 * 1000)), to: now };
  if (p === "30d") return { from: startOfDay(new Date(now.getTime() - 30 * 24 * 3600 * 1000)), to: now };

  // today default
  return { from: startOfDay(now), to: endOfDay(now) };
}

function safeISO(d: Date) {
  return isValidDate(d) ? d.toISOString() : new Date().toISOString();
}

export default async function SiteEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const preset = sp.preset || "24h";

  let from: Date | null = null;
  let to: Date | null = null;

  if (sp.from && sp.to) {
    const s = new Date(sp.from);
    const e = new Date(sp.to);
    if (isValidDate(s) && isValidDate(e)) {
      from = startOfDay(s);
      to = endOfDay(e);
    }
  }

  if (!from || !to) {
    const r = rangeFromPreset(preset);
    from = r.from;
    to = r.to;
  }

  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("site_events")
    .select("*")
    .gte("created_at", safeISO(from))
    .lte("created_at", safeISO(to))
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Error loading site events: {error.message}
      </div>
    );
  }

  const rows = (data || []) as SiteEventRow[];

  return (
    <SiteEventsClient
      rows={rows}
      initialFrom={from.toISOString().slice(0, 10)}
      initialTo={to.toISOString().slice(0, 10)}
      initialPreset={preset}
    />
  );
}
