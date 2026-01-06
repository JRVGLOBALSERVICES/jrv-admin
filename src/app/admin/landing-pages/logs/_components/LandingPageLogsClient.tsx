"use client";

import { useState } from "react";
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

const ACTIONS = [
    { label: "All Actions", value: "" },
    { label: "Create Page", value: "CREATE_LANDING_PAGE" },
    { label: "Update Page", value: "UPDATE_LANDING_PAGE" },
    { label: "Delete Page", value: "DELETE_LANDING_PAGE" },
];

function buildUrl(path: string, params: Record<string, any>) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === "" || v == null) return;
        sp.set(k, String(v));
    });
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
}

export default function LandingPageLogsClient({ initial, meta, options }: any) {
    const router = useRouter();
    const path = usePathname();

    const [q, setQ] = useState(initial.q || "");
    const [action, setAction] = useState(initial.action || "");
    const [pageId, setPageId] = useState(initial.landing_page_id || "");
    const [actorId, setActorId] = useState(initial.actor_user_id || "");
    const [pageSize, setPageSize] = useState(initial.page_size || 50);

    const apply = () =>
        router.push(
            buildUrl(path, {
                q: q.trim(),
                action,
                landing_page_id: pageId.trim(),
                actor_user_id: actorId.trim(),
                page: 1,
                page_size: pageSize,
            })
        );
    const clear = () => {
        setQ("");
        setAction("");
        setPageId("");
        setActorId("");
        router.push(path);
    };

    const labelClass = "text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block";
    const selectClass = "w-full border-0 bg-gray-50 rounded-lg px-3 py-2 text-xs ring-1 ring-gray-200 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all font-medium h-9";

    return (
        <Card className="p-0 border-gray-200 shadow-sm bg-white overflow-hidden rounded-xl">
            <div className="p-5 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                <div className="font-black text-xs text-gray-700 flex items-center gap-2 uppercase tracking-tighter">
                    <Filter size={16} className="text-purple-600" /> Filter Audit Trail
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={clear} variant="secondary" size="sm" className="h-8 px-3 text-[10px] uppercase font-black tracking-widest bg-white">
                        <RotateCcw size={12} className="mr-1.5" /> Reset
                    </Button>
                    <Button onClick={apply} size="sm" className="h-8 px-5 text-[10px] uppercase font-black tracking-widest bg-purple-600 hover:bg-purple-700 shadow-sm">
                        Apply
                    </Button>
                </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-1 space-y-1">
                    <label className={labelClass}>Search</label>
                    <div className="relative">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={14}
                        />
                        <input
                            className={`${selectClass} pl-9`}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Action or UUID..."
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className={labelClass}>Action Type</label>
                    <select
                        className={selectClass}
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                    >
                        {ACTIONS.map((a) => (
                            <option key={a.value} value={a.value}>
                                {a.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className={labelClass}>Actor</label>
                    <select
                        className={selectClass}
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
                    <label className={labelClass}>Landing Page</label>
                    <select
                        className={selectClass}
                        value={pageId}
                        onChange={(e) => setPageId(e.target.value)}
                    >
                        <option value="">All Pages</option>
                        {options.landingPages.map((p: any) => (
                            <option key={p.id} value={p.id}>
                                {p.menu_label || p.slug || p.id}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className={labelClass}>Page Size</label>
                    <div className="flex items-center gap-2">
                        <select
                            className={selectClass}
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                        >
                            {[10, 25, 50, 100].map((n) => (
                                <option key={n} value={n}>
                                    {n} Rows
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-1 shrink-0">
                            <Button
                                onClick={() => router.push(buildUrl(path, { ...initial, page: initial.page - 1 }))}
                                disabled={initial.page <= 1}
                                variant="secondary"
                                className="h-9 w-9 p-0 bg-white"
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <Button
                                onClick={() => router.push(buildUrl(path, { ...initial, page: initial.page + 1 }))}
                                disabled={initial.page >= meta.totalPages}
                                variant="secondary"
                                className="h-9 w-9 p-0 bg-white"
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 py-3 bg-white border-t border-gray-100 flex items-center justify-between">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Showing {meta.total} entries
                </div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">
                    Page {initial.page} of {meta.totalPages || 1}
                </div>
            </div>
        </Card>
    );
}
