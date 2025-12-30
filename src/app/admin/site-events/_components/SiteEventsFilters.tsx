"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Filters = {
  event: string;
  traffic: string;
  device: string;
  path: string;
};

export default function SiteEventsFilters({
  rangeKey,
  from,
  to,
  filters,
}: {
  rangeKey: string;
  from: string;
  to: string;
  filters: Filters;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [localRange, setLocalRange] = useState(rangeKey || "24h");
  const [localFrom, setLocalFrom] = useState(from || "");
  const [localTo, setLocalTo] = useState(to || "");
  const [local, setLocal] = useState<Filters>({
    event: filters.event || "",
    traffic: filters.traffic || "",
    device: filters.device || "",
    path: filters.path || "",
  });

  useEffect(() => setLocalRange(rangeKey || "24h"), [rangeKey]);
  useEffect(() => setLocalFrom(from || ""), [from]);
  useEffect(() => setLocalTo(to || ""), [to]);
  useEffect(() => {
    setLocal({
      event: filters.event || "",
      traffic: filters.traffic || "",
      device: filters.device || "",
      path: filters.path || "",
    });
  }, [filters.event, filters.traffic, filters.device, filters.path]);

  const canApply = useMemo(() => {
    if (localRange !== "custom") return true;
    return !!localFrom && !!localTo;
  }, [localRange, localFrom, localTo]);

  function buildQuery() {
    const params = new URLSearchParams(sp.toString());

    params.set("range", localRange);

    if (localRange === "custom") {
      if (localFrom) params.set("from", localFrom);
      if (localTo) params.set("to", localTo);
    } else {
      params.delete("from");
      params.delete("to");
    }

    const setOrDel = (k: keyof Filters, v: string) => {
      if (v && v.trim()) params.set(k, v.trim());
      else params.delete(k);
    };

    setOrDel("event", local.event);
    setOrDel("traffic", local.traffic);
    setOrDel("device", local.device);
    setOrDel("path", local.path);

    return params.toString();
  }

  function onApply() {
    if (!canApply) return;
    const qs = buildQuery();
    startTransition(() => {
      router.replace(`/admin/site-events?${qs}`);
    });
  }

  function onReset() {
    startTransition(() => {
      router.replace(`/admin/site-events?range=24h`);
    });
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900">Filters</div>
          <div className="text-xs text-gray-500">
            Apply to everything (events + summary + referrers + geo)
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onReset} disabled={isPending} variant="primary">
            Reset
          </Button>

          <Button
            onClick={onApply}
            disabled={isPending || !canApply}
            variant="secondary"
          >
            {isPending ? "Applying…" : "Apply"}
          </Button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">Range</div>
          <select
            value={localRange}
            onChange={(e) => setLocalRange(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">From</div>
          <input
            type="date"
            value={localRange === "custom" ? localFrom : ""}
            onChange={(e) => setLocalFrom(e.target.value)}
            disabled={localRange !== "custom"}
            className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">To</div>
          <input
            type="date"
            value={localRange === "custom" ? localTo : ""}
            onChange={(e) => setLocalTo(e.target.value)}
            disabled={localRange !== "custom"}
            className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">Event</div>
          <input
            value={local.event}
            onChange={(e) => setLocal((p) => ({ ...p, event: e.target.value }))}
            placeholder="e.g. whatsapp_click"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            Traffic
          </div>
          <select
            value={local.traffic}
            onChange={(e) =>
              setLocal((p) => ({ ...p, traffic: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="direct">Direct</option>
            <option value="organic">Organic</option>
            <option value="paid">Paid</option>
            <option value="referral">Referral</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">Device</div>
          <select
            value={local.device}
            onChange={(e) =>
              setLocal((p) => ({ ...p, device: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="mobile">Mobile</option>
            <option value="desktop">Desktop</option>
            <option value="tablet">Tablet</option>
          </select>
        </div>

        <div className="md:col-span-6">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            Path contains
          </div>
          <input
            value={local.path}
            onChange={(e) => setLocal((p) => ({ ...p, path: e.target.value }))}
            placeholder="/cars/..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
