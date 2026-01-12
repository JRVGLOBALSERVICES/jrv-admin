import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export type KpiColor =
    | "blue"
    | "green"
    | "purple"
    | "orange"
    | "pink"
    | "indigo"
    | "emerald"
    | "amber"
    | "rose"
    | "slate";

interface GaStatCardProps {
    title: string;
    value: string | number;
    prevValue?: string | number;
    sub?: string; // Expecting "+10%" or "-5%" string
    color?: KpiColor;
    className?: string;
    loading?: boolean;
    pulse?: boolean;
    icon?: any;
    trendDirection?: "up" | "down";
}

export default function GaStatCard({
    title,
    value,
    prevValue,
    sub,
    color = "blue",
    className = "",
    loading = false,
    pulse = false,
    icon: Icon,
    trendDirection = "up",
}: GaStatCardProps) {
    // Parse trend
    let trend: "up" | "down" | "neutral" = "neutral";
    let trendVal = sub || "";

    if (sub?.includes("+") || (sub && !sub.includes("-") && sub !== "0%")) {
        trend = "up";
    } else if (sub?.includes("-")) {
        trend = "down";
    }

    const styles: Record<KpiColor, { text: string; blob: string }> = {
        blue: { text: "text-blue-600", blob: "bg-linear-to-br from-cyan-400 to-blue-600" },
        green: { text: "text-green-600", blob: "bg-linear-to-br from-emerald-400 to-green-600" },
        emerald: { text: "text-emerald-600", blob: "bg-linear-to-br from-emerald-400 to-teal-600" },
        purple: { text: "text-purple-600", blob: "bg-linear-to-br from-violet-400 to-purple-600" },
        orange: { text: "text-orange-600", blob: "bg-linear-to-br from-amber-400 to-orange-600" },
        pink: { text: "text-pink-600", blob: "bg-linear-to-br from-rose-400 to-pink-600" },
        indigo: { text: "text-indigo-600", blob: "bg-linear-to-br from-indigo-400 to-blue-600" },
        amber: { text: "text-amber-600", blob: "bg-linear-to-br from-amber-400 to-orange-500" },
        rose: { text: "text-rose-600", blob: "bg-linear-to-br from-rose-400 to-red-600" },
        slate: { text: "text-slate-600", blob: "bg-linear-to-br from-slate-400 to-gray-600" },
    };

    const s = styles[color] || styles.blue;
    const ringColor = trendDirection === "down" ? "ring-rose-400" : "ring-emerald-400";

    return (
        <div
            className={`
        relative overflow-hidden rounded-2xl p-4 md:p-5 bg-white border border-gray-100 shadow-xl flex flex-col justify-between h-full transition-all duration-300 group
        ${pulse ? `ring-4 ${ringColor} scale-105 animate-pulse shadow-2xl` : 'hover:shadow-2xl'}
        ${className}
      `}
        >
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${s.blob} opacity-20 transition-transform group-hover:scale-110`} />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
                    {Icon && <Icon className={`w-5 h-5 ${s.text} opacity-80`} />}
                </div>

                <div className="flex items-end justify-between gap-1">
                    <div className="flex flex-col">
                        {loading ? (
                            <div className="h-8 w-24 animate-pulse rounded bg-gray-100" />
                        ) : (
                            <div className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
                                {typeof value === 'number' ? value.toLocaleString() : value}
                            </div>
                        )}
                        {prevValue !== undefined && !loading && (
                            <div className="text-[10px] font-bold text-gray-400">
                                vs {typeof prevValue === 'number' ? prevValue.toLocaleString() : prevValue} prev.
                            </div>
                        )}
                    </div>

                    {/* Trend Indicator */}
                    {sub && !loading && (
                        <div
                            className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-gray-100 ${trend === "up" ? "bg-emerald-50 text-emerald-700" : trend === "down" ? "bg-rose-50 text-rose-700" : "bg-gray-50 text-gray-500"
                                }`}
                        >
                            {trend === "up" && <ArrowUpRight className="w-2.5 h-2.5" />}
                            {trend === "down" && <ArrowDownRight className="w-2.5 h-2.5" />}
                            {trend === "neutral" && <Minus className="w-2.5 h-2.5" />}
                            {trendVal}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
