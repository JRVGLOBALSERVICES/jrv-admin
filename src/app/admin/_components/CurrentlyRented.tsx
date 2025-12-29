"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function Pill({ label, value, tone = "dark" }: { label: string; value: number; tone?: "dark" | "green" | "blue" }) {
  const cls =
    tone === "green"
      ? "bg-emerald-100 text-emerald-900 border-emerald-200"
      : tone === "blue"
      ? "bg-blue-100 text-blue-900 border-blue-200"
      : "bg-gray-100 text-gray-900 border-gray-200";

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border ${cls}`}>
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

function remainingMs(endIso?: string | null) {
  if (!endIso) return 0;
  const end = new Date(endIso).getTime();
  const now = Date.now();
  return Math.max(0, end - now);
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
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => remainingMs(a.date_end) - remainingMs(b.date_end));
  }, [rows]);

  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-blue-50">
        <div className="min-w-0">
          <div className="font-bold text-blue-900">{title}</div>
          <div className="text-xs text-blue-700 opacity-80">Active agreements right now</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* ✅ header pill badges */}
          <Pill label="Rented" value={rentedCount} tone="blue" />
          <Pill label="Available" value={availableCount} tone="green" />

          <Link className="text-xs font-semibold text-blue-800 hover:underline ml-1" href="/admin/agreements">
            View
          </Link>
        </div>
      </div>

      {!sorted.length ? (
        <div className="p-6 text-sm opacity-60 text-center">No active rentals right now.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sorted.map((r) => {
            const ms = remainingMs(r.date_end);
            const client = (r.customer_name && r.customer_name.trim()) || r.mobile || "—";
            const mobileRaw = (r.mobile || "").replace(/\D/g, "");
            const whatsappLink = mobileRaw ? `https://wa.me/${mobileRaw}` : "#";

            return (
              <div
                key={r.agreement_id}
                className="p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between hover:bg-gray-50 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold text-gray-900">{r.plate_number}</div>
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                      {r.car_label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Client: <span className="font-medium text-gray-800">{client}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <div className="px-3 py-1.5 rounded-md text-xs font-bold tabular-nums border bg-blue-100 text-blue-900 border-blue-200">
                    {formatCountdown(ms)}
                  </div>

                  {/* ✅ WhatsApp icon */}
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-full border transition ${
                      mobileRaw
                        ? "bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                        : "bg-gray-50 text-gray-300 border-gray-200 pointer-events-none"
                    }`}
                    title="WhatsApp"
                  >
                    <WhatsAppIcon />
                  </a>

                  {/* ✅ Open button */}
                  <Link
                    href={`/admin/agreements/${r.agreement_id}`}
                    className="px-3 py-2 rounded-full text-xs font-bold border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 transition"
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
