"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type HapticsMode = "auto" | "on" | "off";
type SoundMode = "auto" | "on" | "off";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  haptics?: HapticsMode;
  sound?: SoundMode;
  fullWidth?: boolean;
};

function isTouchLike(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0)
  );
}

/** ===== Reliable WebAudio click tick (shared AudioContext) ===== */
let sharedCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedCtx) sharedCtx = new AudioCtx();
  return sharedCtx;
}

// tiny "tick" sound using WebAudio (no file needed)
function playClickTick() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    // iOS / Safari sometimes starts suspended; resume within the user gesture
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "triangle";
    o.frequency.value = 420;

    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    o.connect(g);
    g.connect(ctx.destination);

    o.start(t);
    o.stop(t + 0.07);
  } catch {
    // ignore
  }
}

function doHapticPulse(durationMs = 10) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(durationMs);
    }
  } catch {
    // ignore
  }
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium select-none " +
  "transition will-change-transform " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/60 " +
  "disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none " +
  "active:scale-[0.98]";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-black text-white hover:bg-black/90 active:bg-black/80 shadow-sm cursor-pointer",
  secondary:
    "bg-white text-black border border-black/15 hover:bg-black/5 active:bg-black/10 cursor-pointer",
  ghost: "bg-black text-white hover:bg-black/5 active:bg-black/10 hover:text-black cursor-pointer",
  danger:
    "bg-red-600 text-white hover:bg-red-600/90 active:bg-red-700 shadow-sm cursor-pointer",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"
      aria-hidden="true"
    />
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      haptics = "auto",
      sound = "auto",
      fullWidth = false,
      disabled,
      onClick,
      children,
      type,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const shouldHaptic =
      haptics === "on" || (haptics === "auto" && isTouchLike());

    // ✅ "auto" = mobile/touch only (more sensible)
    const shouldSound = sound === "on" || (sound === "auto" && isTouchLike());

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }

      // feedback FIRST for perceived responsiveness
      if (shouldHaptic) doHapticPulse(10);
      if (shouldSound) playClickTick();

      onClick?.(e);
    };

    // default button type: "button" (prevents accidental form submits)
    const resolvedType = type ?? "button";

    return (
      <button
        ref={ref}
        type={resolvedType}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        onClick={handleClick}
        {...props}
      >
        {loading ? <Spinner /> : null}
        <span className={cn(loading && "opacity-90")}>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
