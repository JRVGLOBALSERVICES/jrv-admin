"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function fmtMoney(v: any) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "RM 0.00";
  return `RM ${n.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgreementsClient() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [actor, setActor] = useState("");
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");

  const [filters, setFilters] = useState<{ plates: any[]; models: any[] }>({
    plates: [],
    models: [],
  });

  const canReset = useMemo(
    () => !!(q || status || actor || plate || model),
    [q, status, actor, plate, model]
  );

  const loadFilters = async () => {
    try {
      const res = await fetch(`/admin/agreements/api?filtersOnly=1`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) setFilters(json.filters || { plates: [], models: [] });
    } catch {}
  };

  const fetchRows = async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        q,
        status,
        actor,
        plate,
        model,
      });
      const res = await fetch(`/admin/agreements/api?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setRows(json.rows || []);
      if (json.filters) setFilters(json.filters);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    fetchRows();
  }, [page]);

  useEffect(() => {
    setPage(1);
  }, [q, status, actor, plate, model]);

  useEffect(() => {
    fetchRows();
  }, [q, status, actor, plate, model]);

  const reset = () => {
    setQ("");
    setStatus("");
    setActor("");
    setPlate("");
    setModel("");
    setPage(1);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Agreements</div>
          <div className="text-sm opacity-70">
            Create, preview PDF, confirm, WhatsApp, logs.
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/agreements/new">
            <Button type="button" variant="primary" sound="on">
              + New
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-3 space-y-2">
        <div className="grid md:grid-cols-6 gap-2">
          <input
            className="border rounded-lg px-3 py-2 md:col-span-2"
            placeholder="Search (name/ic/phone)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 bg-white"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
          >
            <option value="">All plates</option>
            {filters.plates.map((p: any) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            className="border rounded-lg px-3 py-2 bg-white"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="">All models</option>
            {filters.models.map((m: any) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Actor email filter"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 bg-white"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All status</option>
            <option value="New">New</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={loadFilters}>
            Refresh Filters
          </Button>
          <Button variant="secondary" onClick={reset} disabled={!canReset}>
            Reset
          </Button>
        </div>
      </Card>

      {err ? (
        <div className="rounded-lg border bg-red-50 text-red-700 p-3 text-sm">
          {err}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="min-w-275 w-full text-sm">
          <thead className="bg-black/5">
            <tr className="text-left">
              <th className="p-3">Plate</th>
              <th className="p-3">Car</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
              <th className="p-3">Total</th>
              <th className="p-3">Deposit</th>
              <th className="p-3">Status</th>
              <th className="p-3">Links</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center opacity-60">
                  Loading…
                </td>
              </tr>
            ) : null}

            {!loading && !rows.length ? (
              <tr>
                <td colSpan={10} className="p-8 text-center opacity-60">
                  No agreements
                </td>
              </tr>
            ) : null}

            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.plate_number ?? "—"}</td>
                <td className="p-3">{r.car_label ?? "—"}</td>
                <td className="p-3">
                  <div className="font-medium">{r.customer_name ?? "—"}</div>
                  <div className="text-xs opacity-70">
                    {r.mobile ?? "—"} • {r.id_number ?? "—"}
                  </div>
                </td>
                <td className="p-3">{fmtDateTime(r.date_start)}</td>
                <td className="p-3">{fmtDateTime(r.date_end)}</td>
                <td className="p-3">{fmtMoney(r.total_price)}</td>
                <td className="p-3">{fmtMoney(r.deposit_price)}</td>
                <td className="p-3">{r.status ?? "—"}</td>
                <td className="p-3">
                  <div className="flex gap-3">
                    {r.agreement_url ? (
                      <a
                        className="underline"
                        target="_blank"
                        rel="noreferrer"
                        href={r.agreement_url}
                      >
                        PDF
                      </a>
                    ) : (
                      <span className="opacity-50">—</span>
                    )}
                    {r.whatsapp_url ? (
                      <a
                        className="underline"
                        target="_blank"
                        rel="noreferrer"
                        href={r.whatsapp_url}
                      >
                        WhatsApp
                      </a>
                    ) : (
                      <span className="opacity-50">—</span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <Link
                    className="underline"
                    href={`/admin/agreements/${r.id}`}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Prev
        </Button>
        <div className="text-sm opacity-70">Page {page}</div>
        <Button
          variant="secondary"
          onClick={() => setPage((p) => p + 1)}
          disabled={rows.length < limit}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
