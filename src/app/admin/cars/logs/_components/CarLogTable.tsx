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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

type LogEntry = {
    id: string;
    created_at: string;
    actor_user_id: string; // Changed from actor_email to match schema
    actor_email: string;   // Hydrated prop
    action: string;
    car_id: string;
    meta: any; // Contains old/new or snapshot
};

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
function getDiff(meta: any) {
    const diffs: { key: string; old: any; new: any }[] = [];

    if (!meta) return [];

    // If explicitly structured as old/new (from our new audit logic)
    if (meta.old && meta.new) {
        const allKeys = new Set([...Object.keys(meta.old), ...Object.keys(meta.new)]);
        allKeys.forEach(key => {
            if (["updated_at", "created_at"].includes(key)) return;
            const v1 = meta.old[key];
            const v2 = meta.new[key];
            if (JSON.stringify(v1) !== JSON.stringify(v2)) {
                diffs.push({ key, old: v1, new: v2 });
            }
        });
        return diffs;
    }

    // If it's a snapshot (meta itself is the object), no diff to show in "Changes" section
    return [];
}

export function CarLogTable({ initialLogs }: { initialLogs: LogEntry[] }) {
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

    const diffs = selectedLog ? getDiff(selectedLog.meta) : [];

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Actor</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Car ID</th>
                            <th className="px-4 py-3 text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {initialLogs.map((log) => (
                            <tr
                                key={log.id}
                                className="hover:bg-gray-50/50 transition-colors"
                            >
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                                    {fmtDate(log.created_at)}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                            {(log.actor_email || "SY").slice(0, 2).toUpperCase()}
                                        </div>
                                        {log.actor_email || "System"}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold capitalize 
                    ${log.action.includes("DELETE")
                                                ? "bg-red-50 text-red-600"
                                                : log.action.includes("CREATE")
                                                    ? "bg-green-50 text-green-600"
                                                    : "bg-blue-50 text-blue-600"
                                            }`}
                                    >
                                        {log.action.replace(/_CAR/g, "").replace(/_/g, " ")}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                                    {log.car_id ? (
                                        <Link
                                            href={`/admin/cars/${log.car_id}`}
                                            className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                                        >
                                            {log.car_id.slice(0, 8)}...
                                        </Link>
                                    ) : "—"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setSelectedLog(log)}
                                        className="p-6"
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {initialLogs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                    No logs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL --- */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm text-gray-500">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg capitalize">
                                        {selectedLog.action.replace(/_/g, " ")}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" /> {selectedLog.actor_email || "System"}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />{" "}
                                            {fmtDate(selectedLog.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {diffs.length > 0 ? (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-orange-400" />{" "}
                                        Changed Fields
                                    </h4>
                                    <div className="grid gap-2">
                                        {diffs.map((diff, i) => (
                                            <div
                                                key={i}
                                                className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm"
                                            >
                                                <div className="min-w-30 font-bold text-gray-700 capitalize">
                                                    {diff.key.replace(/_/g, " ")}
                                                </div>
                                                <div className="flex-1 flex items-center gap-3 w-full">
                                                    <div className="flex-1 bg-red-50/50 text-red-700 px-2 py-1 rounded border border-red-100/50 break-all">
                                                        {String(diff.old ?? "—")}
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                                                    <div className="flex-1 bg-green-50/50 text-green-700 px-2 py-1 rounded border border-green-100/50 break-all font-medium">
                                                        {String(diff.new ?? "—")}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-100 text-center">
                                    {selectedLog.action.includes("CREATE") ? "New Record Created" : "Full Snapshot (No Direct Diff available)"}
                                </div>
                            )}

                            <details className="group border border-gray-200 rounded-lg overflow-hidden">
                                <summary className="p-3 bg-gray-50 text-xs font-bold text-gray-500 cursor-pointer flex items-center gap-2 select-none hover:bg-gray-100 transition-colors">
                                    <Code className="w-3.5 h-3.5" />
                                    RAW DATA SNAPSHOT
                                </summary>
                                <pre className="p-4 text-[10px] text-gray-600 font-mono whitespace-pre-wrap bg-slate-50">
                                    {JSON.stringify(selectedLog.meta, null, 2)}
                                </pre>
                            </details>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button onClick={() => setSelectedLog(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
