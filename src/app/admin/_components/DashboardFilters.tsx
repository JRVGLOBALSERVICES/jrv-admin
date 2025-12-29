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

  // Get current params
  const currentPeriod = (searchParams.get("period") as Period) ?? "daily";
  const model = searchParams.get("model") ?? "";
  const plate = searchParams.get("plate") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";

  const [customStart, setCustomStart] = useState(fromParam);
  const [customEnd, setCustomEnd] = useState(toParam);

  // If we have dates in URL, we are in 'custom' mode visually
  const activePeriod = fromParam && toParam ? "custom" : currentPeriod;

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
    // If clicking a preset, clear custom dates
    updateParams({ period: p, from: null, to: null });
    setCustomStart("");
    setCustomEnd("");
  };

  const handleDateApply = () => {
    if (customStart && customEnd) {
      updateParams({ period: "custom", from: customStart, to: customEnd });
    }
  };

  const clearAll = () => {
    setCustomStart("");
    setCustomEnd("");
    router.push("/admin");
  };

  return (
    <div className="flex flex-col gap-4 bg-white p-3 rounded-xl border shadow-sm">
      {/* Top Row: Presets + Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period Presets */}
        <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto">
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
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition whitespace-nowrap ${
                activePeriod === p
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-200 hidden md:block" />

        {/* Model Filter */}
        <select
          value={model}
          onChange={(e) => updateParams({ model: e.target.value })}
          className="text-sm border-none bg-gray-50 rounded-lg px-3 py-2 focus:ring-1 focus:ring-black min-w-35"
        >
          <option value="">All Models</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* Plate Filter */}
        <select
          value={plate}
          onChange={(e) => updateParams({ plate: e.target.value })}
          className="text-sm border-none bg-gray-50 rounded-lg px-3 py-2 focus:ring-1 focus:ring-black min-w-35"
        >
          <option value="">All Plates</option>
          {plates.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {(model || plate || activePeriod !== "daily") && (
          <button
            onClick={clearAll}
            className="text-xs text-red-600 hover:underline px-2 whitespace-nowrap"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Bottom Row: Custom Date Picker */}
      <div className="flex items-center gap-2 text-sm border-t pt-3">
        <span className="text-gray-500 text-xs uppercase font-bold tracking-wide">
          Custom Range:
        </span>
        <input
          type="date"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          className="border rounded px-2 py-1 text-sm text-gray-700 focus:ring-black focus:border-black"
        />
        <span className="text-gray-400">→</span>
        <input
          type="date"
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
          className="border rounded px-2 py-1 text-sm text-gray-700 focus:ring-black focus:border-black"
        />
        <button
          onClick={handleDateApply}
          disabled={!customStart || !customEnd}
          className="px-3 py-1 bg-black text-white rounded text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          Go
        </button>
      </div>
    </div>
  );
}
