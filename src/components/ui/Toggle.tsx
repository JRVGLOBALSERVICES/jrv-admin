
import React from "react";

interface ToggleProps {
    label?: React.ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    disabled?: boolean;
}

export function Toggle({ label, checked, onChange, className = "", disabled = false }: ToggleProps) {
    return (
        <label className={`flex items-center justify-between gap-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            {label && <span className="text-sm font-medium text-gray-700 select-none">{label}</span>}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                className={[
                    "h-6 w-11 rounded-full border transition-all duration-200 relative shrink-0",
                    checked
                        ? "bg-pink-500 border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                        : "bg-orange-400 border-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.3)]",
                ].join(" ")}
            >
                <span
                    className={[
                        "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full shadow-sm transition-all duration-200 bg-white",
                        checked ? "left-[22px]" : "left-1",
                    ].join(" ")}
                />
            </button>
        </label>
    );
}
