// src/app/admin/site-events/_components/SiteEventsFilters.tsx
"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  rangeKey: string;
  from: string;
  to: string;
  filters: { event: string; traffic: string; device: string; path: string };
};

export default function SiteEventsFilters({
  rangeKey,
  from,
  to,
  filters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const paramsObj = useMemo(() => {
    const obj: Record<string, string> = {};
    sp.forEach((v, k) => (obj[k] = v));
    return obj;
  }, [sp]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(paramsObj);
    if (!value) next.delete(key);
    else next.set(key, value);

    if (key === "range" && value !== "custom") {
      next.delete("from");
      next.delete("to");
    }

    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
      <div className="lg:col-span-2">
        <label className="text-xs text-gray-500 font-semibold">
          Date Range
        </label>
        <select
          className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
          value={rangeKey}
          onChange={(e) => setParam("range", e.target.value)}
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom</option>
        </select>

        {rangeKey === "custom" ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={from}
              onChange={(e) => setParam("from", e.target.value)}
            />
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={to}
              onChange={(e) => setParam("to", e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div>
        <label className="text-xs text-gray-500 font-semibold">Event</label>
        <select
          className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
          value={filters.event || ""}
          onChange={(e) => setParam("event", e.target.value)}
        >
          <option value="">All</option>
          <option value="site_load">site_load</option>
          <option value="page_view">page_view</option>
          <option value="model_click">model_click</option>
          <option value="whatsapp_click">whatsapp_click</option>
          <option value="phone_click">phone_click</option>
          <option value="car_image_click">car_image_click</option>
          <option value="location_click">location_click</option>
          <option value="service_click">service_click</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500 font-semibold">Traffic</label>
        <select
          className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
          value={filters.traffic || ""}
          onChange={(e) => setParam("traffic", e.target.value)}
        >
          <option value="">All</option>
          <option value="direct">Direct</option>
          <option value="organic">Organic</option>
          <option value="paid">Paid</option>
          <option value="referral">Referral</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500 font-semibold">Device</label>
        <select
          className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
          value={filters.device || ""}
          onChange={(e) => setParam("device", e.target.value)}
        >
          <option value="">All</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500 font-semibold">
          Path contains
        </label>
        <input
          className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
          placeholder="/cars/"
          value={filters.path || ""}
          onChange={(e) => setParam("path", e.target.value)}
        />
      </div>
    </div>
  );
}
