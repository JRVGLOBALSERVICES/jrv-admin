"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X, CheckSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";

type UrgentItem = {
    id: string;
    plate: string;
    make: string;
    model: string;
    type: "Insurance" | "Roadtax";
    date: string;
    days: number;
};

export default function UrgentActionsModal({ items }: { items: UrgentItem[] }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (items.length > 0) {
            // Check session storage so we don't spam the user if they dismissed it this session
            const dismissed = sessionStorage.getItem("urgent_dismissed");
            if (!dismissed) {
                setOpen(true);
            }
        }
    }, [items]);

    const handleDismiss = () => {
        sessionStorage.setItem("urgent_dismissed", "true");
        setOpen(false);
    };

    if (!open || items.length === 0) return null;

    return (
        <div className="h-full fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">

                {/* Header */}
                <div className="bg-red-50 px-6 py-4 flex justify-between items-start border-b border-red-100">
                    <div className="flex gap-3">
                        <div className="mt-1 bg-red-100 p-2 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 leading-tight">Attention Required</h2>
                            <p className="text-sm text-red-700 font-medium">
                                {items.length} items expiring within 24 hours
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-white rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* List */}
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
                    {items.map((item, i) => (
                        <Link
                            href={`/admin/cars/${item.id}`}
                            key={i}
                            onClick={handleDismiss}
                            className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 group-hover:scale-150 transition-transform" />
                                <div>
                                    <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        {item.plate}
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                            {item.type}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 font-medium group-hover:text-indigo-600 transition-colors">
                                        Update Details →
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-red-600">
                                    {item.days < 0 ? `Overdue (${Math.abs(item.days)}d)` : item.days === 0 ? "Today" : "Tomorrow"}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                    {item.date}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
                    <button
                        onClick={handleDismiss}
                        className="text-gray-500 text-sm font-medium hover:text-gray-700 hover:underline"
                    >
                        Dismiss
                    </button>
                    <Link
                        href="/admin/insurance"
                        onClick={() => setOpen(false)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-red-200 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                    >
                        Resolves Issues <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
