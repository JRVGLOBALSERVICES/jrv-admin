"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

type CarLite = { id: string; plate: string; model: string };
type AgreementLite = {
  car_id: string | null;
  date_start: string | null;
  date_end: string | null;
  total_price: number;
  status: string | null;
};

type SortMode = "revenue" | "trips" | "days";

function fmtMoney(v: number) {
  return `RM ${v.toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function diffDays(s: string | null, e: string | null) {
  if (!s || !e) return 0;
  const start = new Date(s).getTime();
  const end = new Date(e).getTime();
  if (isNaN(start) || isNaN(end)) return 0;
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

export default function FleetHealth({
  cars,
  agreements,
}: {
  cars: CarLite[];
  agreements: AgreementLite[];
}) {
  // Controlled by interactivity, not date filtering
  const [sortBy, setSortBy] = useState<SortMode>("revenue");

  const stats = useMemo(() => {
    // 1. Initialize Map
    const carMap = new Map<
      string,
      {
        id: string;
        plate: string;
        model: string;
        count: number;
        revenue: number;
        days: number;
      }
    >();

    // Pre-fill all active cars with 0
    cars.forEach((c) =>
      carMap.set(c.id, { ...c, count: 0, revenue: 0, days: 0 })
    );

    // 2. Aggregate Data (Data is ALREADY filtered by parent Page)
    agreements.forEach((a) => {
      // Logic: If agreement is in the list, it counts.
      // Parent component handles the date range and status logic.
      if (!a.car_id) return;

      const entry = carMap.get(a.car_id);
      if (entry) {
        entry.count += 1;
        entry.revenue += Number(a.total_price) || 0;
        entry.days += diffDays(a.date_start, a.date_end);
      }
    });

    const allStats = Array.from(carMap.values());

    // 3. Sorting Logic
    const sorted = [...allStats].sort((a, b) => {
      if (sortBy === "revenue") return b.revenue - a.revenue;
      if (sortBy === "days") return b.days - a.days;
      return b.count - a.count; // "trips"
    });

    // 4. Split Active / Inactive
    // "Active" means they have at least 1 trip in this period OR we just show top list
    // We'll split them for the two-column view
    const activeList = sorted.filter((x) => x.count > 0);
    const inactiveList = sorted.filter((x) => x.count === 0);

    return {
      activeList,
      inactiveList,
      totalCars: cars.length,
      activeCount: activeList.length,
      inactiveCount: inactiveList.length,
    };
  }, [cars, agreements, sortBy]);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-full ring-1 ring-gray-100">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            Fleet Activity
            <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {stats.activeCount} Active / {stats.inactiveCount} Idle
            </span>
          </h3>
          <div className="text-xs text-gray-500 mt-1">
            Sorted by{" "}
            <span className="font-bold text-gray-700 capitalize">{sortBy}</span>{" "}
            for selected period
          </div>
        </div>

        {/* Sorting Toggles */}
        <div className="flex bg-gray-100/80 rounded-lg p-1 shadow-inner gap-1">
          {(["revenue", "trips", "days"] as SortMode[]).map((mode) => (
            <Button
              key={mode}
              onClick={() => setSortBy(mode)}
              variant={sortBy === mode ? "tertiary" : "tertiary"}
              size="sm"
              className={`px-3 text-[10px] font-bold uppercase tracking-wider transition-all ${
                sortBy === mode
                  ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                  : "text-gray-400 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x h-full min-h-100">
        {/* LEFT COL: ACTIVE */}
        <div className="flex flex-col bg-white">
          <div className="p-3 bg-emerald-50/30 border-b text-[10px] font-bold text-emerald-800 uppercase tracking-widest flex justify-between">
            <span>🚀 Top Performers</span>
            <span>{sortBy}</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-125 p-2 space-y-2 custom-scrollbar">
            {stats.activeList.length === 0 && (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400 italic">
                No cars active in this period.
              </div>
            )}
            {stats.activeList.map((c, i) => (
              <div
                key={c.id}
                className="group flex items-center justify-between p-2 rounded-lg hover:bg-linear-to-r hover:from-emerald-50/50 hover:to-transparent border border-transparent hover:border-emerald-100 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 shrink-0 flex items-center justify-center text-[10px] font-bold rounded-full ${
                      i < 3
                        ? "bg-emerald-500 text-white shadow-emerald-200 shadow-md"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800 group-hover:text-emerald-700 transition-colors">
                      {c.plate}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium">
                      {c.model}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {/* Primary Metric based on Sort */}
                  <div className="text-sm font-bold text-gray-900 group-hover:text-emerald-700">
                    {sortBy === "revenue" && fmtMoney(c.revenue)}
                    {sortBy === "trips" && (
                      <>
                        {c.count}{" "}
                        <span className="text-[10px] font-normal text-gray-400">
                          trips
                        </span>
                      </>
                    )}
                    {sortBy === "days" && (
                      <>
                        {c.days}{" "}
                        <span className="text-[10px] font-normal text-gray-400">
                          days
                        </span>
                      </>
                    )}
                  </div>
                  {/* Secondary Metrics */}
                  <div className="text-[10px] text-gray-400 flex justify-end gap-2">
                    {sortBy !== "revenue" && <span>{fmtMoney(c.revenue)}</span>}
                    {sortBy !== "days" && <span>{c.days}d</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COL: IDLE / LOW */}
        <div className="flex flex-col bg-gray-50/30">
          <div className="p-3 bg-red-50/30 border-b text-[10px] font-bold text-red-800 uppercase tracking-widest flex justify-between">
            <span>💤 Zero Activity</span>
            <span>Status</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-125 p-2 space-y-2 custom-scrollbar">
            {stats.inactiveList.length === 0 && (
              <div className="h-40 flex items-center justify-center text-xs text-emerald-600 font-medium">
                🎉 100% Fleet Utilization!
              </div>
            )}
            {stats.inactiveList.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all duration-200 opacity-80 hover:opacity-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400 shadow-red-200 shadow-sm" />
                  <div>
                    <div className="text-sm font-bold text-gray-600">
                      {c.plate}
                    </div>
                    <div className="text-[10px] text-gray-400">{c.model}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-red-400 bg-red-50 px-2 py-1 rounded-full">
                    0 Trips
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
