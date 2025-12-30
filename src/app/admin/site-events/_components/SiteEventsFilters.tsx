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

/**
 * Convert YYYY-MM-DD -> Date in user's LOCAL timezone
 */
function dateInputToLocalDate(v: string) {
  // v = "2025-12-31"
  const [y, m, d] = v.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Convert ISO or any date string -> YYYY-MM-DD for <input type="date" />
 */
function anyToDateInput(v: string) {
  if (!v) return "";
  // If already date-only
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Start/end of LOCAL day -> ISO string
 * (Browser in Malaysia => local = Asia/Kuala_Lumpur, so this becomes correct boundaries.)
 */
function localDayStartISO(dateOnly: string) {
  const base = dateInputToLocalDate(dateOnly);
  if (!base) return "";
  const d = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    0,
    0,
    0,
    0
  );
  return d.toISOString();
}

function localDayEndISO(dateOnly: string) {
  const base = dateInputToLocalDate(dateOnly);
  if (!base) return "";
  const d = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    23,
    59,
    59,
    999
  );
  return d.toISOString();
}

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

  // IMPORTANT: store as YYYY-MM-DD for the inputs
  const [localFromDate, setLocalFromDate] = useState(
    anyToDateInput(from || "")
  );
  const [localToDate, setLocalToDate] = useState(anyToDateInput(to || ""));

  const [local, setLocal] = useState<Filters>({
    event: filters.event || "",
    traffic: filters.traffic || "",
    device: filters.device || "",
    path: filters.path || "",
  });

  useEffect(() => setLocalRange(rangeKey || "24h"), [rangeKey]);

  // If server gives ISO, convert to YYYY-MM-DD for date inputs
  useEffect(() => setLocalFromDate(anyToDateInput(from || "")), [from]);
  useEffect(() => setLocalToDate(anyToDateInput(to || "")), [to]);

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
    return !!localFromDate && !!localToDate;
  }, [localRange, localFromDate, localToDate]);

  function buildQuery() {
    const params = new URLSearchParams(sp.toString());

    params.set("range", localRange);

    if (localRange === "custom") {
      // Convert to ISO boundaries
      let fromIso = localDayStartISO(localFromDate);
      let toIso = localDayEndISO(localToDate);

      // Safety: swap if user picked end < start (prevents empty results)
      if (fromIso && toIso) {
        const a = new Date(fromIso).getTime();
        const b = new Date(toIso).getTime();
        if (b < a) {
          const tmp = fromIso;
          fromIso = toIso;
          toIso = tmp;
        }
      }

      if (fromIso) params.set("from", fromIso);
      if (toIso) params.set("to", toIso);

      // Optional (nice): keep UI-friendly dates too
      params.set("fromDate", localFromDate);
      params.set("toDate", localToDate);
    } else {
      params.delete("from");
      params.delete("to");
      params.delete("fromDate");
      params.delete("toDate");
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
            value={localRange === "custom" ? localFromDate : ""}
            onChange={(e) => setLocalFromDate(e.target.value)}
            disabled={localRange !== "custom"}
            className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">To</div>
          <input
            type="date"
            value={localRange === "custom" ? localToDate : ""}
            onChange={(e) => setLocalToDate(e.target.value)}
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
