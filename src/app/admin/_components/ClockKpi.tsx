"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

export default function ClockKpi() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-4 md:p-6 overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 group-hover:bg-indigo-100 transition-colors" />

            <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Live Clock</h3>

                <div className="text-3xl font-black text-gray-900 tabular-nums tracking-tighter leading-none mb-1">
                    {format(time, "HH:mm:ss")}
                </div>

                <div className="text-[10px] font-bold text-indigo-500 uppercase flex flex-col">
                    <span>{format(time, "EEEE")}</span>
                    <span className="text-gray-400">{format(time, "dd MMM yyyy")}</span>
                </div>
            </div>
        </div>
    );
}
