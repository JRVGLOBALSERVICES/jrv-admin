"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ACTIONS = ["", "CREATE_CAR", "UPDATE_CAR", "DELETE_CAR"] as const;

type ActorOption = { user_id: string; email: string | null };
type CarOption = { id: string; plate_number: string | null };

function buildUrl(path: string, params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === "" || v == null) return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export default function CarLogsClient({ initial, meta, options }: any) {
  const router = useRouter();
  const path = usePathname();

  const [q, setQ] = useState(initial.q);
  const [action, setAction] = useState(initial.action);
  const [carId, setCarId] = useState(initial.car_id);
  const [actorId, setActorId] = useState(initial.actor_user_id);
  const [pageSize, setPageSize] = useState(initial.page_size);

  const apply = () =>
    router.push(
      buildUrl(path, {
        q: q.trim(),
        action,
        car_id: carId.trim(),
        actor_user_id: actorId.trim(),
        page: 1,
        page_size: pageSize,
      })
    );
  const clear = () => {
    setQ("");
    setAction("");
    setCarId("");
    setActorId("");
    router.push(path);
  };

  return (
    <Card className="p-5 border-gray-200 shadow-sm bg-white overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-sm text-gray-700 flex items-center gap-2 uppercase tracking-tight">
          <Filter size={18} className="text-blue-500" /> Filter Logs
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={clear} variant="secondary" size="sm">
            <RotateCcw size={14} className="mr-1" /> Reset
          </Button>
          <Button onClick={apply} size="sm">
            Apply
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">
            Search
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={14}
            />
            <input
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Action or UUID..."
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">
            Action
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a || "All"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">
            Actor
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
          >
            <option value="">All Actors</option>
            {options.actors.map((a: any) => (
              <option key={a.user_id} value={a.user_id}>
                {a.email || a.user_id}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">
            Car
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={carId}
            onChange={(e) => setCarId(e.target.value)}
          >
            <option value="">All Cars</option>
            {options.cars.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.plate_number || c.id}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">
            Rows
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between mt-5 pt-4 border-t">
        <div className="text-xs text-gray-400 italic">
          Page {initial.page} of {meta.totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              router.push(
                buildUrl(path, { ...initial, page: initial.page - 1 })
              )
            }
            disabled={initial.page <= 1}
            variant="secondary"
            size="sm"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            onClick={() =>
              router.push(
                buildUrl(path, { ...initial, page: initial.page + 1 })
              )
            }
            disabled={initial.page >= meta.totalPages}
            variant="secondary"
            size="sm"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
