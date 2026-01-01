"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/Button";

type Period =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "all"
  | "custom";

// ✅ Unified "Glossy" Input Style (matches Site Events)
const inputClass =
  "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 h-10";

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
  const [isPending, startTransition] = useTransition();

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
      const url = `${pathname}?${sp.toString()}`;
      startTransition(() => {
        router.push(url, { scroll: false });
      });
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
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  return (
    <div
      className={`bg-white p-4 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 w-full transition-opacity ${
        isPending ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <div className="flex flex-col gap-4">
        {/* Row 1: Period Presets & Reset */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex bg-gray-100/80 p-1 rounded-lg overflow-x-auto no-scrollbar gap-1 w-full md:w-auto">
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
                // @ts-ignore
                sound="on"
                onClick={() => handlePeriodClick(p)}
                size="sm"
                className={`flex-1 md:flex-none px-3 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wide rounded-md transition-all`}
                variant={`${activePeriod === p ? "primary" : "tertiary"}`}
              >
                {p}
              </Button>
            ))}
          </div>

          {(model || plate || activePeriod !== "daily") && (
            <Button
              onClick={clearAll}
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex text-xs text-red-600 hover:bg-red-50 px-2 h-8"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Row 2: Filters & Custom Range */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Dropdowns - Grid on Mobile */}
          <div className="grid grid-cols-2 gap-2 md:flex md:w-auto w-full">
            <select
              value={model}
              onChange={(e) => updateParams({ model: e.target.value })}
              className={inputClass}
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
              className={inputClass}
            >
              <option value="">All Plates</option>
              {plates.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-10 bg-gray-100 hidden md:block" />

          {/* Custom Date - Grid on Mobile */}
          <div className="grid grid-cols-[1fr_1fr_auto] md:flex md:items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className={inputClass}
            />
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className={inputClass}
            />
            <Button
              onClick={handleDateApply}
              disabled={!customStart || !customEnd}
              size="sm"
              // @ts-ignore
              sound="on"
              className="h-10 bg-indigo-600 text-white font-bold px-4 rounded-lg shadow-md hover:bg-indigo-700"
            >
              Go
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
