"use client";

import { useMemo } from "react";
import { normalizePlate, formatPlate } from "@/lib/analytics/plates";
import { rentalDaysInWindow } from "@/lib/analytics/rentalDays";

type CarLite = {
  id: string;
  plate: string;
  plate_norm?: string;
  model: string;
};

type AgreementLite = {
  id: string;
  car_id: string | null;
  plate_number: string | null;
  car_type?: string | null;
  date_start: string | null;
  date_end: string | null;
  total_price: number | null;
  status?: string | null;
};

function fmtMoney(v?: number | null) {
  return `RM ${Number(v ?? 0).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function FleetHealth({
  cars,
  agreements,
  windowStart,
  windowEnd,
}: {
  cars: CarLite[];
  agreements: AgreementLite[];
  windowStart: string; // ISO
  windowEnd: string; // ISO
}) {
  const ws = useMemo(() => new Date(windowStart), [windowStart]);
  const we = useMemo(() => new Date(windowEnd), [windowEnd]);

  const rows = useMemo(() => {
    const byCar = new Map<
      string,
      {
        id: string;
        plate: string;
        plate_norm: string;
        model: string;
        days: number;
        revenue: number;
        trips: number;
      }
    >();

    for (const c of cars || []) {
      const pn = normalizePlate(c.plate);
      byCar.set(c.id, {
        id: c.id,
        plate: formatPlate(c.plate),
        plate_norm: pn,
        model: c.model || "Unknown",
        days: 0,
        revenue: 0,
        trips: 0,
      });
    }

    // quick lookup by plate_norm (because some agreements have null car_id)
    const carIdByPlate = new Map<string, string>();
    for (const c of cars || []) {
      const pn = normalizePlate(c.plate);
      if (pn) carIdByPlate.set(pn, c.id);
    }

    for (const a of agreements || []) {
      const plateNorm = normalizePlate(a.plate_number);
      const resolvedCarId = a.car_id || (plateNorm ? carIdByPlate.get(plateNorm) : undefined);
      if (!resolvedCarId) continue;

      const bucket = byCar.get(resolvedCarId);
      if (!bucket) continue;

      const d = rentalDaysInWindow(a.date_start, a.date_end, ws, we);
      if (d <= 0) continue;

      bucket.days += d;
      bucket.trips += 1;
      bucket.revenue += Number(a.total_price) || 0;
    }

    const arr = Array.from(byCar.values());

    // sort by days running desc, then revenue desc
    arr.sort((a, b) => b.days - a.days || b.revenue - a.revenue);

    return arr;
  }, [cars, agreements, ws, we]);

  const maxDays = Math.max(...rows.map((r) => r.days), 1);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-900">Fleet Health</div>
          <div className="text-xs text-gray-500">
            Based on <span className="font-medium">days running</span> in the selected window (agreements overlapping
            the window).
          </div>
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Window: {new Date(windowStart).toLocaleString("en-MY")} → {new Date(windowEnd).toLocaleString("en-MY")}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b">
            <tr>
              <th className="px-4 py-3 text-left">Plate</th>
              <th className="px-4 py-3 text-left">Model</th>
              <th className="px-4 py-3 text-right">Days Running</th>
              <th className="px-4 py-3 text-right">Trips</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right w-1/4">Activity</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {rows.map((r) => {
              const pct = Math.min(100, Math.round((r.days / maxDays) * 100));
              const active = r.days > 0;
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.plate || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.model}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.days}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{r.trips}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmtMoney(r.revenue)}</td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={active ? "bg-emerald-500 h-2 rounded-full" : "bg-gray-300 h-2 rounded-full"}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No fleet data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
