"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

type Row = {
  agreement_id: string;
  car_id: string;
  plate_number: string;
  car_label: string;
  customer_name: string | null;
  mobile: string | null;
  date_end: string | null;
  status: string | null;
};

// ... Icons (WhatsAppIcon) ...
function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function Pill({
  label,
  value,
  tone = "dark",
}: {
  label: string;
  value: number;
  tone?: "dark" | "green" | "blue";
}) {
  const gradients = {
    green: "from-emerald-400 to-green-500 shadow-emerald-200",
    blue: "from-blue-400 to-indigo-500 shadow-blue-200",
    dark: "from-gray-700 to-gray-800 shadow-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full text-white shadow-md bg-linear-to-r ${gradients[tone] || gradients.dark
        }`}
    >
      <span className="opacity-90">{label}</span>
      <span className="bg-white/20 px-1.5 rounded-md tabular-nums">
        {value}
      </span>
    </span>
  );
}

function remainingMs(endIso: string | null | undefined, nowMs: number) {
  if (!endIso) return 0;
  const end = new Date(endIso).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - nowMs);
}

function formatCountdown(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600) % 24;
  const d = Math.floor(totalSec / 86400);

  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function CurrentlyRented({
  title,
  rows,
  availableCount,
  rentedCount,
}: {
  title: string;
  rows: Row[];
  availableCount: number;
  rentedCount: number;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [asOf, setAsOf] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    setAsOf(format(new Date(), "HH:mm dd MMM"));
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    return [...rows].sort(
      (a, b) => remainingMs(a.date_end, nowMs) - remainingMs(b.date_end, nowMs)
    );
  }, [rows, nowMs]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-xl shadow-gray-200/50 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-blue-100 bg-linear-to-r from-blue-50 via-indigo-50 to-white flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-black text-blue-900 text-sm uppercase tracking-wide">
            {title}
          </div>
          <div className="text-[10px] text-blue-600 font-medium mt-0.5 flex items-center gap-1">
            <span>Active on the road</span>
            {asOf && <span className="opacity-70">• As of {asOf}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Pill label="Rented" value={rentedCount} tone="blue" />
          <Pill label="Free" value={availableCount} tone="green" />
          <Link
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm ml-1"
            href="/admin/agreements"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {!sorted.length ? (
        <div className="p-8 text-sm text-gray-400 text-center italic">
          No active rentals right now.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {sorted.map((r) => {
            const ms = remainingMs(r.date_end, nowMs);
            const client =
              (r.customer_name && r.customer_name.trim()) || r.mobile || "—";
            const mobileRaw = (r.mobile || "").replace(/\D/g, "");
            const whatsappLink = mobileRaw ? `https://wa.me/${mobileRaw}` : "#";

            return (
              <div
                key={r.agreement_id}
                className="p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between hover:bg-blue-50/30 transition-colors text-sm group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold text-gray-900">
                      {r.plate_number}
                    </div>
                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-medium border border-gray-200">
                      {r.car_label}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-medium">
                    Client: <span className="text-gray-700">{client}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-end">
                  <div className="px-3 py-1 rounded-md text-xs font-bold tabular-nums bg-blue-50 text-blue-700 border border-blue-100 shadow-sm min-w-17.5 text-center">
                    {formatCountdown(ms)}
                  </div>

                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-full border transition-all shadow-sm ${mobileRaw
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white"
                      : "bg-gray-50 text-gray-300 border-gray-200 pointer-events-none"
                      }`}
                    title="WhatsApp"
                  >
                    <WhatsAppIcon />
                  </a>

                  <Link
                    href={`/admin/agreements/${r.agreement_id}`}
                    className="px-3 py-1.5 rounded-full text-[10px] font-bold border border-blue-200 bg-white text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm uppercase tracking-wide"
                  >
                    Open
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
