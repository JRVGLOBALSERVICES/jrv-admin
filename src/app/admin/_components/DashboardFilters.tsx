"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

type Period =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "all"
  | "custom";

export default function DashboardFilters({
  plates,
  models,
}: {
  plates: string[];
  models: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPeriod = (searchParams.get("period") as Period) ?? "daily";
  const model = searchParams.get("model") ?? "";
  const plate = searchParams.get("plate") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";

  const [customStart, setCustomStart] = useState(fromParam);
  const [customEnd, setCustomEnd] = useState(toParam);

  const activePeriod = fromParam && toParam ? "custom" : currentPeriod;

  // ✅ Fix: Sync state with URL params (e.g. when Reset is clicked)
  useEffect(() => {
    setCustomStart(fromParam);
    setCustomEnd(toParam);
  }, [fromParam, toParam]);

  const updateParams = useCallback(
    (newParams: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, val]) => {
        if (val) sp.set(key, val);
        else sp.delete(key);
      });
      router.push(`/admin?${sp.toString()}`);
    },
    [router, searchParams]
  );

  const handlePeriodClick = (p: Period) => {
    updateParams({ period: p, from: null, to: null });
  };

  const handleDateApply = () => {
    if (customStart && customEnd) {
      updateParams({ period: "custom", from: customStart, to: customEnd });
    }
  };

  const clearAll = () => {
    router.push("/admin");
  };

  return (
    <div className="bg-white p-3 md:p-4 rounded-xl border shadow-sm w-full">
      <div className="flex flex-col gap-3">
        {/* Row 1: Period Presets */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto no-scrollbar flex-nowrap w-full md:w-auto">
            {(
              [
                "daily",
                "weekly",
                "monthly",
                "quarterly",
                "yearly",
                "all",
              ] as Period[]
            ).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodClick(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition whitespace-nowrap shrink-0 ${
                  activePeriod === p
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="hidden md:block h-6 w-px bg-gray-200 shrink-0" />

          {/* Desktop Reset Link */}
          {(model || plate || activePeriod !== "daily") && (
            <button
              onClick={clearAll}
              className="hidden md:block text-xs text-red-600 hover:underline px-2 whitespace-nowrap ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Row 2: Dropdowns */}
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
          <select
            value={model}
            onChange={(e) => updateParams({ model: e.target.value })}
            className="w-full md:w-auto text-sm border-none bg-gray-50 rounded-lg px-3 py-2 focus:ring-1 focus:ring-black md:min-w-35 truncate"
          >
            <option value="">All Models</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={plate}
            onChange={(e) => updateParams({ plate: e.target.value })}
            className="w-full md:w-auto text-sm border-none bg-gray-50 rounded-lg px-3 py-2 focus:ring-1 focus:ring-black md:min-w-35 truncate"
          >
            <option value="">All Plates</option>
            {plates.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* --- Bottom Section: Custom Date Range (Stable Mobile Layout) --- */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wide md:mr-2">
            Custom Range
          </span>

          {/* ✅ STABLE LAYOUT: Vertical on Mobile, Horizontal on Desktop */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full md:w-auto border rounded px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-black outline-none transition"
            />
            <span className="text-gray-400 self-center hidden md:inline">
              →
            </span>
            <span className="text-gray-400 text-xs text-center md:hidden">
              to
            </span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full md:w-auto border rounded px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-black outline-none transition"
            />
          </div>

          <button
            onClick={handleDateApply}
            disabled={!customStart || !customEnd}
            type="button" // ✅ Prevent form submission
            className="w-full md:w-auto px-4 py-2 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-gray-800 disabled:opacity-50 transition shadow-sm"
          >
            Apply
          </button>

          {(model || plate || activePeriod !== "daily") && (
            <button
              onClick={clearAll}
              className="md:hidden w-full text-center text-xs text-red-600 py-2 mt-1 border border-red-100 rounded-lg bg-red-50"
              type="button"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
