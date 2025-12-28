"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  car_type: string | null;
  number_plate: string | null;
  mobile: string | null;
  status: string | null;
  date_start: string | null;
  date_end: string | null;
  total_price: number | null;
};

function getPlate(r: Row) {
  const p2 = (r.number_plate ?? "").trim();
  return p2 || "—";
}

function getCarType(r: Row) {
  return (r.car_type ?? "").trim() || "Unknown";
}

function fmtMoney(v?: number | null) {
  if (v == null) return "—";
  return `RM ${Number(v).toLocaleString("en-MY")}`;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const totalHr = Math.floor(totalMin / 60);
  const h = totalHr % 24;
  const d = Math.floor(totalHr / 24);

  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function ExpiringSoon({
  title,
  subtitle,
  rows,
  error,
}: {
  title: string;
  subtitle?: string;
  rows: Row[];
  error?: string | null;
}) {
  const [, tick] = useState(0);

  // update countdown every 1s
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => remainingMs(a.date_end) - remainingMs(b.date_end));
  }, [rows]);

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-xs opacity-60">{subtitle}</div> : null}
        </div>

        <Link className="text-sm underline" href="/admin/agreements">
          Open agreements
        </Link>
      </div>

      {error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : null}

      {!sorted.length ? (
        <div className="p-6 text-sm opacity-60">No agreements expiring soon.</div>
      ) : (
        <div className="divide-y">
          {sorted.slice(0, 12).map((r) => {
            const ms = remainingMs(r.date_end);
            const isExpired = ms <= 0;
            const countdown = formatCountdown(ms);

            return (
              <div key={r.id} className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold">{getPlate(r)}</div>
                    <span className="rounded-full border px-2 py-1 text-[11px]">
                      {r.status ?? "—"}
                    </span>
                    <span className="text-sm opacity-70 truncate">{getCarType(r)}</span>
                  </div>

                  <div className="text-xs opacity-60">
                    Ends: {fmtDate(r.date_end)} • Total: {fmtMoney(r.total_price)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "px-3 py-2 rounded-lg border text-sm font-medium tabular-nums",
                      isExpired ? "bg-red-50 border-red-200 text-red-700" : "bg-black/3",
                    ].join(" ")}
                    title={isExpired ? "Expired" : "Time remaining"}
                  >
                    {isExpired ? "Expired" : countdown}
                  </div>

                  <Link className="text-sm underline" href={`/admin/agreements/${r.id}`}>
                    View
                  </Link>
                </div>
              </div>
            );
          })}

          {sorted.length > 12 ? (
            <div className="px-4 py-3 text-xs opacity-60">
              Showing 12 of {sorted.length}.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
