"use client";

import { useState } from "react";
import {
    Eye,
    X,
    ArrowRight,
    User,
    Calendar,
    Activity,
    Code,
    Globe,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

type LogEntry = {
    id: string;
    created_at: string;
    actor_user_id: string;
    actor_email?: string;
    action: string;
    landing_page_id: string;
    landing_page_label?: string;
    landing_page_slug?: string;
    meta: any;
};

const FIELD_LABELS: Record<string, string> = {
    status: "Status",
    menu_label: "Menu Label",
    slug: "URL Slug",
    category: "Category",
    title: "SEO Title (BM)",
    title_en: "SEO Title (EN)",
    h1_title: "H1 Heading (BM)",
    h1_title_en: "H1 Heading (EN)",
    cta_text: "CTA Text (BM)",
    cta_text_en: "CTA Text (EN)",
    images: "Visual Assets / Images",
    image_prompts: "AI Image Prompts",
    body_content: "Body Content (BM)",
    body_content_en: "Body Content (EN)",
};

const IGNORE_FIELDS = ["updated_at", "created_at", "id", "created_by", "meta"];

// Helper to format date
function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("en-MY", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Helper to detect changes between two objects
function getDiff(before: any, after: any) {
    const changes: { key: string; old: any; new: any }[] = [];
    const allKeys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {}),
    ]);

    allKeys.forEach((key) => {
        if (IGNORE_FIELDS.includes(key)) return;

        const val1 = before?.[key];
        const val2 = after?.[key];

        // Loose equality check
        if (JSON.stringify(val1) !== JSON.stringify(val2)) {
            changes.push({ key, old: val1, new: val2 });
        }
    });

    return changes;
}

export function LandingPageLogTable({ logs }: { logs: LogEntry[] }) {
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

    // Calculate Diff for selected log
    const diffs = selectedLog?.meta?.old && selectedLog?.meta?.new
        ? getDiff(selectedLog.meta.old, selectedLog.meta.new)
        : [];

    return (
        <>
            {/* --- TABLE LIST --- */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 uppercase text-[10px] tracking-widest">
                            <tr>
                                <th className="px-4 py-3">Timestamp</th>
                                <th className="px-4 py-3 text-center">Action</th>
                                <th className="px-4 py-3">Landing Page</th>
                                <th className="px-4 py-3">Actor</th>
                                <th className="px-4 py-3 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map((log) => (
                                <tr
                                    key={log.id}
                                    className="hover:bg-gray-50/50 transition-colors"
                                >
                                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                                        {fmtDate(log.created_at)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border 
                      ${log.action.includes("DELETE")
                                                    ? "bg-red-50 text-red-700 border-red-200"
                                                    : log.action.includes("CREATE")
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                }`}
                                        >
                                            {log.action.replace("_LANDING_PAGE", "").replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-gray-900 text-xs">
                                        <div className="flex items-center gap-2">
                                            <Globe size={14} className="text-purple-400" />
                                            {log.landing_page_slug ? (
                                                <Link
                                                    href={`/admin/landing-pages/${log.landing_page_slug}`}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                >
                                                    {log.landing_page_label || "View Page"}
                                                </Link>
                                            ) : (
                                                <span className="text-gray-400 italic">
                                                    {log.landing_page_label || "Deleted Page"}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600 font-semibold italic">
                                        {log.actor_email || "System/Unknown"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setSelectedLog(log)}
                                            className="h-8 px-3 text-[10px] font-bold uppercase tracking-wide"
                                        >
                                            <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">
                                        No log entries found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- DETAIL MODAL --- */}
            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm text-purple-600">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-base uppercase tracking-tight">
                                        {selectedLog.action.replace(/_/g, " ")}
                                    </h3>
                                    <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                                        <span className="flex items-center gap-1.5">
                                            <User className="w-3 h-3 text-gray-400" /> {selectedLog.actor_email || "System"}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 text-gray-400" />{" "}
                                            {fmtDate(selectedLog.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Context Info */}
                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 flex items-center gap-3">
                                <Globe className="text-purple-600" size={18} />
                                <div>
                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Landing Page</p>
                                    {selectedLog.landing_page_slug ? (
                                        <Link
                                            href={`/admin/landing-pages/${selectedLog.landing_page_slug}`}
                                            className="font-bold text-gray-900 hover:text-purple-700 transition-colors underline decoration-purple-200 underline-offset-4"
                                        >
                                            {selectedLog.landing_page_label}
                                        </Link>
                                    ) : (
                                        <p className="font-bold text-gray-900">{selectedLog.landing_page_label}</p>
                                    )}
                                </div>
                            </div>

                            {/* Changes Section */}
                            {diffs.length > 0 ? (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />{" "}
                                        Modified Fields
                                    </h4>
                                    <div className="space-y-3">
                                        {diffs.map((diff, i) => (
                                            <div
                                                key={i}
                                                className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 space-y-2.5"
                                            >
                                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                                                    {FIELD_LABELS[diff.key] || diff.key.replace(/_/g, " ")}
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-[13px]">
                                                    <div className="flex-1 bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-100 break-all font-medium min-h-[40px] flex items-center">
                                                        {String(diff.old ?? "—")}
                                                    </div>
                                                    <div className="flex justify-center shrink-0">
                                                        <ArrowRight className="w-5 h-5 text-gray-300 sm:rotate-0 rotate-90" strokeWidth={3} />
                                                    </div>
                                                    <div className="flex-1 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-100 break-all font-bold min-h-[40px] flex items-center">
                                                        {String(diff.new ?? "—")}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 bg-blue-50/50 text-blue-700 text-sm rounded-2xl border border-blue-100 text-center font-medium italic">
                                    {selectedLog.action.includes("CREATE")
                                        ? "Full snapshot recorded on creation."
                                        : "No data field changes were detected in this action."}
                                </div>
                            )}

                            {/* Raw Snapshot Section */}
                            <details className="group border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                <summary className="p-3 bg-gray-50/50 text-[10px] font-black text-gray-400 cursor-pointer flex items-center gap-2 select-none hover:bg-gray-100 transition-colors uppercase tracking-widest">
                                    <Code className="w-3.5 h-3.5" />
                                    RAW DATA SNAPSHOT
                                </summary>
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 bg-gray-900 border-t border-gray-800">
                                    <div className="p-4 overflow-x-auto">
                                        <div className="text-[9px] font-black text-gray-500 mb-3 uppercase tracking-widest">
                                            Before Action
                                        </div>
                                        <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-relaxed">
                                            {selectedLog.meta?.old ? (
                                                JSON.stringify(selectedLog.meta.old, null, 2)
                                            ) : (
                                                <span className="text-gray-600 italic">None (Entry Point)</span>
                                            )}
                                        </pre>
                                    </div>
                                    <div className="p-4 overflow-x-auto">
                                        <div className="text-[9px] font-black text-gray-500 mb-3 uppercase tracking-widest">
                                            After Action
                                        </div>
                                        <pre className="text-[10px] text-emerald-400/80 font-mono whitespace-pre-wrap leading-relaxed">
                                            {selectedLog.meta?.new ? (
                                                JSON.stringify(selectedLog.meta.new, null, 2)
                                            ) : (
                                                <span className="text-gray-600 italic">None (Termination)</span>
                                            )}
                                        </pre>
                                    </div>
                                </div>
                            </details>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button onClick={() => setSelectedLog(null)} className="font-bold uppercase text-xs tracking-widest px-8">Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
