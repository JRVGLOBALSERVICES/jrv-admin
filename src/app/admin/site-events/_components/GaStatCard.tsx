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

import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface GaStatCardProps {
    title: string;
    value: string | number;
    prevValue?: string | number;
    sub?: string; // Expecting "+10%" or "-5%" string
    color?: KpiColor;
    className?: string;
    loading?: boolean;
    pulse?: boolean;
}

export default function GaStatCard({
    title,
    value,
    prevValue,
    sub,
    color,
    className = "",
    loading = false,
    pulse = false,
}: GaStatCardProps) {
    // Parse trend
    let trend: "up" | "down" | "neutral" = "neutral";
    let trendVal = sub || "";

    if (sub?.includes("+") || (sub && !sub.includes("-") && sub !== "0%")) {
        trend = "up";
    } else if (sub?.includes("-")) {
        trend = "down";
    }

    // Glossy Gradients
    const gradients: Record<KpiColor, string> = {
        blue: "from-cyan-500 to-blue-600 shadow-blue-200",
        green: "from-emerald-400 to-green-600 shadow-green-200",
        emerald: "from-emerald-500 to-teal-600 shadow-emerald-300",
        purple: "from-violet-400 to-purple-600 shadow-purple-200",
        orange: "from-amber-400 to-orange-600 shadow-orange-200",
        pink: "from-rose-400 to-red-600 shadow-rose-200",
        indigo: "from-indigo-400 to-blue-800 shadow-indigo-200",
        amber: "from-amber-400 to-orange-500 shadow-amber-200",
        rose: "from-rose-400 to-red-600 shadow-rose-200",
        slate: "from-slate-500 to-slate-700 shadow-slate-200",
    };

    const isGlossy = !!color;
    const selectedGradient = color ? gradients[color] : "";

    return (
        <div
            className={`
        relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between h-full shadow-lg transition-all duration-300 ${pulse ? 'scale-105 animate-pulse ring-4 ring-emerald-400 shadow-2xl' : 'hover:scale-[1.02]'}
        ${isGlossy ? `bg-linear-to-br ${selectedGradient} text-white` : "bg-white border border-gray-100 text-gray-900"}
        ${className}
      `}
        >
            {isGlossy && (
                <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/20 to-transparent pointer-events-none" />
            )}

            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${isGlossy ? "opacity-90" : "text-gray-500"}`}>
                {title}
            </div>

            <div className="flex items-end justify-between gap-1 relative z-10">
                <div className="flex flex-col">
                    {loading ? (
                        <div className={`h-8 w-24 animate-pulse rounded ${isGlossy ? 'bg-white/20' : 'bg-gray-100'}`} />
                    ) : (
                        <div className="text-3xl font-black tracking-tight drop-shadow-sm leading-none">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </div>
                    )}
                    {prevValue !== undefined && !loading && (
                        <div className={`text-[10px] font-bold mt-1 ${isGlossy ? 'opacity-80' : 'text-gray-400'}`}>
                            vs {typeof prevValue === 'number' ? prevValue.toLocaleString() : prevValue} prev.
                        </div>
                    )}
                </div>

                {/* Trend Indicator */}
                {sub && !loading && (
                    <div
                        className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${isGlossy
                            ? "bg-white/20 text-white shadow-sm"
                            : (trend === "up" ? "bg-emerald-50 text-emerald-700" : trend === "down" ? "bg-rose-50 text-rose-700" : "bg-gray-100 text-gray-600")
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
    );
}
