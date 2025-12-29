"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button"; // ✅ Import

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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPeriod = (searchParams.get("period") as Period) ?? "daily";
  const model = searchParams.get("model") ?? "";
  const plate = searchParams.get("plate") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";

  const [customStart, setCustomStart] = useState(fromParam);
  const [customEnd, setCustomEnd] = useState(toParam);

  const activePeriod = fromParam && toParam ? "custom" : currentPeriod;

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
      router.push(`${pathname}?${sp.toString()}`);
    },
    [router, pathname, searchParams]
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
    router.push(pathname);
  };

  return (
    <div className="bg-white p-3 md:p-4 rounded-xl border shadow-sm w-full">
      <div className="flex flex-col gap-3">
        {/* Row 1: Period Presets */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto no-scrollbar flex-nowrap w-full md:w-auto gap-1">
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
              <Button
                key={p}
                sound="on"
                onClick={() => handlePeriodClick(p)}
                variant={activePeriod === p ? "primary" : "secondary"}
                size="sm"
                className={`px-3 text-xs font-medium capitalize shrink-0 ${
                  activePeriod !== p
                    ? "text-gray-500 hover:text-black bg-transparent"
                    : ""
                }`}
              >
                {p}
              </Button>
            ))}
          </div>

          <div className="hidden md:block h-6 w-px bg-gray-200 shrink-0" />

          {/* Desktop Reset Link */}
          {(model || plate || activePeriod !== "daily") && (
            <Button
              onClick={clearAll}
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex text-xs text-red-600 hover:bg-red-50 hover:text-red-700 px-2 ml-auto"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Row 2: Dropdowns */}
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
          <select
            value={model}
            onChange={(e) => updateParams({ model: e.target.value })}
            className="w-full md:w-auto text-sm border-none bg-gray-50 rounded-lg px-3 py-2 focus:ring-1 focus:ring-black md:min-w-35 truncate h-10"
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
            className="w-full md:w-auto text-sm border-none bg-gray-50 rounded-lg px-3 py-2 focus:ring-1 focus:ring-black md:min-w-35 truncate h-10"
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

      {/* --- Bottom Section: Custom Date Range --- */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wide md:mr-2">
            Custom Range
          </span>

          <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full md:w-auto border rounded px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-black outline-none transition h-10"
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
              className="w-full md:w-auto border rounded px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-black outline-none transition h-10"
            />
          </div>

          <Button
            onClick={handleDateApply}
            disabled={!customStart || !customEnd}
            size="sm"
            className="w-full md:w-auto font-bold uppercase tracking-wide"
            sound="on"
          >
            Apply
          </Button>

          {(model || plate || activePeriod !== "daily") && (
            <Button
              onClick={clearAll}
              variant="danger"
              size="sm"
              sound="on"
              className="md:hidden w-full bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:text-red-700 shadow-none"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
