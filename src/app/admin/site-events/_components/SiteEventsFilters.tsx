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

// Safety default
const DEFAULT_FILTERS: Filters = {
  event: "",
  traffic: "",
  device: "",
  path: "",
};

/**
 * Convert YYYY-MM-DD -> Date in user's LOCAL timezone
 */
function dateInputToLocalDate(v: string) {
  const [y, m, d] = v.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Convert ISO or any date string -> YYYY-MM-DD for <input type="date" />
 */
function anyToDateInput(v: string) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function localDayStartISO(dateOnly: string) {
  const base = dateInputToLocalDate(dateOnly);
  if (!base) return "";
  const d = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    6,
    0,
    0,
    0
  );
  return d.toISOString();
}

function localDayEndISO(dateOnly: string) {
  const base = dateInputToLocalDate(dateOnly);
  if (!base) return "";
  const start = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    6,
    0,
    0,
    0
  );
  return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

export default function SiteEventsFilters({
  rangeKey,
  from,
  to,
  filters = DEFAULT_FILTERS,
  eventOptions = [],
}: {
  rangeKey: string;
  from: string;
  to: string;
  filters?: Filters;
  eventOptions?: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [localRange, setLocalRange] = useState(rangeKey || "24h");
  const [localFromDate, setLocalFromDate] = useState(
    anyToDateInput(from || "")
  );
  const [localToDate, setLocalToDate] = useState(anyToDateInput(to || ""));

  const [local, setLocal] = useState<Filters>(filters || DEFAULT_FILTERS);

  useEffect(() => setLocalRange(rangeKey || "24h"), [rangeKey]);
  useEffect(() => setLocalFromDate(anyToDateInput(from || "")), [from]);
  useEffect(() => setLocalToDate(anyToDateInput(to || "")), [to]);

  useEffect(() => {
    const safeFilters = filters || DEFAULT_FILTERS;
    setLocal({
      event: safeFilters.event || "",
      traffic: safeFilters.traffic || "",
      device: safeFilters.device || "",
      path: safeFilters.path || "",
    });
  }, [filters]);

  const canApply = useMemo(() => {
    if (localRange !== "custom") return true;
    return !!localFromDate && !!localToDate;
  }, [localRange, localFromDate, localToDate]);

  function buildQuery() {
    const params = new URLSearchParams(sp.toString());
    params.set("range", localRange);

    if (localRange === "custom") {
      let fromIso = localDayStartISO(localFromDate);
      let toIso = localDayEndISO(localToDate);

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

  const inputClass =
    "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800";
  const labelClass =
    "text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden mb-6">
      {/* Header with Gradient */}
      <div className="p-4 border-b border-gray-100 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white rounded-md shadow-sm border border-indigo-100 text-indigo-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">
              Filters & Range
            </div>
            <div className="text-[10px] text-gray-500 font-medium">
              Refine your analytics view
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onReset}
            disabled={isPending}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
          >
            Reset
          </Button>

          <Button
            onClick={onApply}
            disabled={isPending || !canApply}
            size="sm"
            className={`font-bold transition-all shadow-md ${
              isPending || !canApply
                ? "opacity-50"
                : "bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-0"
            }`}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-3 w-3 text-white"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Updating...
              </span>
            ) : (
              "Apply Filters"
            )}
          </Button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-x-4 gap-y-4">
        {/* Time Range Section */}
        <div className="lg:col-span-2 space-y-4 p-3 rounded-xl bg-gray-50/50 border border-gray-100">
          <div>
            <label className={labelClass}>Time Range</label>
            <select
              value={localRange}
              onChange={(e) => setLocalRange(e.target.value)}
              className={inputClass}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div
            className={`grid grid-cols-2 gap-2 transition-opacity duration-300 ${
              localRange !== "custom"
                ? "opacity-40 pointer-events-none"
                : "opacity-100"
            }`}
          >
            <div>
              <label className={labelClass}>From</label>
              <input
                type="date"
                value={localFromDate}
                onChange={(e) => setLocalFromDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>To</label>
              <input
                type="date"
                value={localToDate}
                onChange={(e) => setLocalToDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-1">
          <div className="col-span-1">
            <label className={labelClass}>Event Type</label>
            <select
              value={local.event}
              onChange={(e) =>
                setLocal((p) => ({ ...p, event: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">All Events</option>
              {eventOptions.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1">
            <label className={labelClass}>Traffic Source</label>
            <select
              value={local.traffic}
              onChange={(e) =>
                setLocal((p) => ({ ...p, traffic: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">All Sources</option>
              <option value="direct">Direct</option>
              <option value="organic">Organic</option>
              <option value="paid">Paid Search</option>
              <option value="referral">Referral</option>
            </select>
          </div>

          <div className="col-span-1">
            <label className={labelClass}>Device</label>
            <select
              value={local.device}
              onChange={(e) =>
                setLocal((p) => ({ ...p, device: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">All Devices</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
            </select>
          </div>

          <div className="col-span-1">
            <label className={labelClass}>Path (Contains)</label>
            <div className="relative">
              <input
                value={local.path}
                onChange={(e) =>
                  setLocal((p) => ({ ...p, path: e.target.value }))
                }
                placeholder="/cars/..."
                className={`${inputClass} pl-8`}
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
