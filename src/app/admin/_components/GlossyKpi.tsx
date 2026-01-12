
import React from 'react';

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

interface GlossyKpiProps {
  title: string;
  value: string | number;
  sub?: string;
  color?: KpiColor;
  icon?: React.ElementType;
  pulse?: boolean;
  trend?: "up" | "down";
}

export default function GlossyKpi({
  title,
  value,
  sub,
  color = "blue",
  icon: Icon,
  pulse = false,
  trend = "up",
}: GlossyKpiProps) {
  const styles: Record<KpiColor, { bg: string; text: string; blob: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", blob: "bg-linear-to-br from-cyan-400 to-blue-600" },
    green: { bg: "bg-green-50", text: "text-green-600", blob: "bg-linear-to-br from-emerald-400 to-green-600" },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      blob: "bg-linear-to-br from-emerald-400 to-teal-600",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      blob: "bg-linear-to-br from-violet-400 to-purple-600",
    },
    orange: {
      bg: "bg-orange-50",
      text: "text-orange-600",
      blob: "bg-linear-to-br from-amber-400 to-orange-600",
    },
    pink: { bg: "bg-pink-50", text: "text-pink-600", blob: "bg-linear-to-br from-rose-400 to-pink-600" },
    indigo: {
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      blob: "bg-linear-to-br from-indigo-400 to-blue-600",
    },
    amber: { bg: "bg-amber-50", text: "text-amber-600", blob: "bg-linear-to-br from-amber-400 to-orange-500" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", blob: "bg-linear-to-br from-rose-400 to-red-600" },
    slate: { bg: "bg-slate-50", text: "text-slate-600", blob: "bg-linear-to-br from-slate-400 to-gray-600" },
  };

  const s = styles[color] || styles.blue;
  const ringColor = trend === "down" ? "ring-rose-400" : "ring-emerald-400";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 md:p-5 bg-white border border-gray-100 shadow-xl group transition-all duration-300 h-full flex flex-col justify-between ${pulse ? `scale-105 ring-4 ${ringColor} shadow-2xl animate-pulse` : "hover:shadow-2xl hover:scale-[1.02]"
        }`}
    >
      {/* Decorative Blob */}
      <div
        className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${s.blob} opacity-20 transition-transform group-hover:scale-110`}
      />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">
            {title}
          </h3>
          {Icon && <Icon className={`w-5 h-5 ${s.text} opacity-80`} />}
        </div>

        <div className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>

        {sub && (
          <div
            className={`text-[10px] font-bold ${s.text} bg-white/50 backdrop-blur-md inline-block px-2 py-1 rounded-md mt-1 border border-gray-100 shadow-sm`}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
