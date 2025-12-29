"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button"; // ✅ Import

type CarLite = { id: string; plate: string; model: string; };
type AgreementLite = { car_id: string | null; date_start: string | null; total_price: number; };
type Timeframe = "1m" | "3m" | "6m" | "1y";

function fmtMoney(v: number) {
  return `RM ${v.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function FleetHealth({
  cars,
  agreements,
}: {
  cars: CarLite[];
  agreements: AgreementLite[];
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1m");

  const stats = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (timeframe === "1m") cutoff.setMonth(now.getMonth() - 1);
    else if (timeframe === "3m") cutoff.setMonth(now.getMonth() - 3);
    else if (timeframe === "6m") cutoff.setMonth(now.getMonth() - 6);
    else cutoff.setFullYear(now.getFullYear() - 1);

    const carMap = new Map<string, { id: string; plate: string; model: string; count: number; revenue: number }>();
    cars.forEach(c => carMap.set(c.id, { ...c, count: 0, revenue: 0 }));

    agreements.forEach(a => {
      if (!a.car_id || !a.date_start) return;
      if (new Date(a.date_start) >= cutoff) {
        const entry = carMap.get(a.car_id);
        if (entry) { entry.count += 1; entry.revenue += (Number(a.total_price) || 0); }
      }
    });

    const allStats = Array.from(carMap.values());
    const active = [...allStats].sort((a, b) => b.count - a.count).slice(0, 10);
    const inactive = [...allStats].filter(x => x.count === 0).length;
    const lowActivity = [...allStats].filter(x => x.count > 0).sort((a, b) => a.count - b.count).slice(0, 10);

    return { active, inactive, lowActivity, totalCars: cars.length };
  }, [cars, agreements, timeframe]);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-800">Fleet Health & Activity</h3>
          <div className="text-xs text-gray-500">{stats.inactive} cars have 0 rentals in this period.</div>
        </div>
        <div className="flex bg-white rounded-lg border p-1 shadow-sm gap-1">
          {(["1m", "3m", "6m", "1y"] as Timeframe[]).map((t) => (
            <Button
              key={t}
              onClick={() => setTimeframe(t)}
              variant={timeframe === t ? "primary" : "secondary"}
              size="sm"
              className={`px-3 text-xs font-bold uppercase ${timeframe !== t ? "text-gray-500 bg-transparent hover:bg-gray-100" : ""}`}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x h-full">
        <div className="flex flex-col">
          <div className="p-3 bg-green-50/50 border-b text-xs font-bold text-green-800 uppercase tracking-wider flex justify-between">
            <span>🔥 Most Active</span><span>Trips / Rev</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-100 p-2 space-y-2">
            {stats.active.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-green-50/30 border border-transparent hover:border-green-100 transition">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 text-xs font-bold rounded-full">{i + 1}</div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{c.plate}</div>
                    <div className="text-[10px] text-gray-500">{c.model}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-700">{c.count}</div>
                  <div className="text-[10px] text-gray-400">{fmtMoney(c.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="p-3 bg-red-50/50 border-b text-xs font-bold text-red-800 uppercase tracking-wider flex justify-between">
            <span>💤 Low Activity / Inactive</span><span>Trips / Rev</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-100 p-2 space-y-2">
            {stats.lowActivity.length === 0 && <div className="p-4 text-center text-xs text-gray-400">All cars are active! 🎉</div>}
            {stats.lowActivity.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-red-50/30 border border-transparent hover:border-red-100 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${c.count === 0 ? "bg-red-500" : "bg-orange-400"}`} />
                  <div>
                    <div className="text-sm font-bold text-gray-700">{c.plate}</div>
                    <div className="text-[10px] text-gray-500">{c.model}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-700">{c.count}</div>
                  <div className="text-[10px] text-gray-400">{fmtMoney(c.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}