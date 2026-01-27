"use client";

import Link from "next/link";
import { useMemo } from "react";

type Row = {
  agreement_id: string;
  car_id: string;
  plate_number: string;
  car_label: string;
  customer_name: string | null;
  mobile: string | null;
  date_start: string | null;
  status: string | null;
};

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-MY", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function UpcomingBookings({
  title,
  rows,
}: {
  title: string;
  rows: Row[];
}) {
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const A = a.date_start ? new Date(a.date_start).getTime() : Infinity;
      const B = b.date_start ? new Date(b.date_start).getTime() : Infinity;
      return A - B;
    });
  }, [rows]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-xl shadow-gray-200/50 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-indigo-100 bg-linear-to-r from-indigo-50 via-blue-50 to-white flex items-center justify-between">
        <div>
          <div className="font-black text-indigo-900 text-sm uppercase tracking-wide">
            {title}
          </div>
          <div className="text-[10px] text-indigo-700 font-bold mt-0.5">
            Departing soon (48h)
          </div>
        </div>
        <Link
          className="text-[10px] font-bold bg-white/80 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-md hover:bg-indigo-600 hover:text-white transition-colors shadow-sm"
          href="/admin/agreements"
        >
          View All
        </Link>
      </div>

      {!sorted.length ? (
        <div className="p-8 text-sm text-gray-600 text-center italic">
          No upcoming bookings in the next 48h.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {sorted.map((r) => {
            const client =
              (r.customer_name && r.customer_name.trim()) || r.mobile || "—";
            return (
              <div
                key={r.agreement_id}
                className="p-3 flex items-center justify-between hover:bg-indigo-50/30 transition-colors text-sm group"
              >
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 group-hover:text-indigo-800 transition-colors">
                    {r.plate_number}
                  </div>
                  <div className="text-xs text-gray-700 truncate">
                    {r.car_label}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
                    Client:{" "}
                    <span className="font-bold text-gray-600">{client}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                    {fmtTime(r.date_start)}
                  </div>
                  <Link
                    href={`/admin/agreements/${r.agreement_id}`}
                    className="mt-1 block transition-all"
                  >
                    <span className="inline-block bg-white border border-indigo-200 text-indigo-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm hover:bg-indigo-50">
                      OPEN
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
