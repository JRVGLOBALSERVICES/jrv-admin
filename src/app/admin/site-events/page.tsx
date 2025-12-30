// src/app/admin/site-events/page.tsx
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import SiteEventsClient from "./_components/SiteEventsClient";

export const metadata: Metadata = pageMetadata({
  title: "Site Events",
  description: "GA-style analytics for JRV site events",
  path: "/admin/site-events",
  index: false,
});

function iso(d: Date) {
  return d.toISOString();
}

export default async function SiteEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  // default last 7 days
  const now = new Date();
  const from = sp.from ? new Date(sp.from) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const to = sp.to ? new Date(sp.to) : now;

  const safeFrom = isNaN(from.getTime()) ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : from;
  const safeTo = isNaN(to.getTime()) ? now : to;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <SiteEventsClient initialFrom={iso(safeFrom)} initialTo={iso(safeTo)} />
    </div>
  );
}
