
import React from 'react';

export type KpiColor =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "pink"
  | "indigo"
  | "emerald"
  | "slate";

interface GlossyKpiProps {
  title: string;
  value: string | number;
  sub?: string;
  color?: KpiColor;
  icon?: React.ElementType;
  pulse?: boolean;
}

export default function GlossyKpi({
  title,
  value,
  sub,
  color = "blue",
  icon: Icon,
  pulse = false,
}: GlossyKpiProps) {
  const gradients: Record<KpiColor, string> = {
    blue: "from-cyan-500 to-blue-600 shadow-blue-200",
    green: "from-emerald-400 to-green-600 shadow-green-200",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-300",
    purple: "from-violet-400 to-purple-600 shadow-purple-200",
    orange: "from-amber-400 to-orange-600 shadow-orange-200",
    pink: "from-rose-400 to-red-600 shadow-rose-200",
    indigo: "from-indigo-400 to-blue-800 shadow-indigo-200",
    slate: "from-slate-500 to-slate-700 shadow-slate-200",
  };

  const selectedGradient = gradients[color] || gradients.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg bg-linear-to-br ${selectedGradient} group transition-all duration-500 ${
        pulse
          ? "scale-105 animate-pulse ring-4 ring-emerald-400 shadow-2xl"
          : "hover:scale-[1.02]"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/30 to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
            {title}
          </span>
          {Icon && (
            <Icon
              className={`w-4 h-4 ${pulse ? "animate-bounce" : "opacity-60"}`}
            />
          )}
        </div>
        <div className="text-3xl font-black mt-2 tracking-tight drop-shadow-sm">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {sub && (
          <div className="text-xs font-medium mt-1 opacity-90 flex items-center gap-1">
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
              {sub}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
