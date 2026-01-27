"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

const ACTIONS = ["create_post", "update_post", "delete_post"] as const;

function buildUrl(path: string, params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === "" || v == null) return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export default function MarketingTrackerClient({
  initial,
  meta,
  options,
}: {
  initial: {
    q: string;
    action: string;
    actor_email: string;
    page: number;
    page_size: number;
  };
  meta: { total: number; totalPages: number };
  options: { actors: { email: string }[] };
}) {
  const router = useRouter();
  const path = usePathname();

  const [q, setQ] = useState(initial.q);
  const [action, setAction] = useState(initial.action);
  const [actorEmail, setActorEmail] = useState(initial.actor_email);
  const [pageSize, setPageSize] = useState(initial.page_size);

  const apply = () => {
    router.push(
      buildUrl(path, {
        q: q.trim(),
        action,
        actor_email: actorEmail.trim(),
        page: 1,
        page_size: pageSize,
      })
    );
  };

  const clear = () => {
    setQ("");
    setAction("");
    setActorEmail("");
    router.push(path);
  };

  return (
    <Card className="p-5 border-gray-200 shadow-sm bg-white overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-sm text-gray-700 flex items-center gap-2 uppercase tracking-tight">
          <Filter size={18} className="text-blue-500" /> Filter Logs
          <span className="ml-2 normal-case font-bold text-gray-400">
            ({meta.total} records)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={clear} variant="secondary" size="sm" className="p-6">
            <RotateCcw size={14} className="mr-1" /> Reset
          </Button>
          <Button onClick={apply} size="sm" className="p-6">
            Apply Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
            Search Keywords
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={14}
            />
            <input
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 ring-blue-500 outline-none transition"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
            Action Type
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">All Actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
            Actor (Email)
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
          >
            <option value="">All Actors</option>
            {options.actors.map((a) => (
              <option key={a.email} value={a.email}>
                {a.email}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
            Per Page
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} rows
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
        <div className="text-xs font-bold text-gray-500 italic">
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
