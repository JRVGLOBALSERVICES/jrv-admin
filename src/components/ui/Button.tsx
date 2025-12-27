"use client";

import * as React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type HapticsMode = "off" | "auto";
export type SoundMode = "off" | "on";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function playClickSound() {
  try {
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sine";
    o.frequency.value = 520;
    g.gain.value = 0.025;

    o.connect(g);
    g.connect(ctx.destination);

    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close().catch(() => {});
    }, 30);
  } catch {}
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    fullWidth?: boolean;
    haptics?: HapticsMode;
    sound?: SoundMode;
  }
>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    haptics = "auto",
    sound = "off",
    disabled,
    onClick,
    children,
    ...props
  },
  ref
) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition " +
    "focus:outline-none focus:ring-2 focus:ring-black/20 " +
    "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-black text-white hover:bg-black/90",
    secondary:
      "bg-white border border-black/15 hover:bg-black/5 text-black",
    ghost: "bg-transparent hover:bg-black/5 text-black",
    danger:
      "bg-red-600 text-white hover:bg-red-600/90 focus:ring-red-500/30",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      onClick={(e) => {
        if (sound === "on") playClickSound();
        if (
          haptics === "auto" &&
          typeof navigator !== "undefined" &&
          "vibrate" in navigator
        ) {
          navigator.vibrate?.(10);
        }
        onClick?.(e);
      }}
      {...props}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
});
