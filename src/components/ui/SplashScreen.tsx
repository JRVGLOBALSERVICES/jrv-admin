"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
// Make sure this file exists, or use a dummy URL for now
import loadingAnim from "../../../public/assets/loading.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show splash for 2 seconds total (reduced from 5s)
    const timer = setTimeout(() => {
      startExit();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const startExit = () => {
    setIsExiting(true);
    // Allow 500ms for the fade-out animation to finish before unmounting
    setTimeout(() => {
      if (onFinish) onFinish();
    }, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black transition-all duration-500 ${isExiting ? "opacity-0 pointer-events-none scale-105" : "opacity-100"
        }`}
    >
      <div className="flex flex-col items-center gap-6 relative">
        {/* ✅ ANIMATION 1: LOGO (Scale + Opacity) */}
        {/* Simulates: Scale 0->100%, Opacity 0->100% */}
        <div className="animate-scale-in">
          <Lottie
            animationData={loadingAnim}
            loop={true}
            autoPlay={true}
            rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
          />
        </div>

        {/* ✅ ANIMATION 2: TEXT (Position + Opacity) */}
        {/* Simulates: Position Y+20 -> Y=0, Opacity 0->100% */}
        {/* We use 'delay-300' so it starts slightly after the logo appears */}
        {/* <div className="text-center space-y-2 animate-fade-in-up delay-300 fill-mode-forwards opacity-0">
          <h1 className="text-3xl md:text-4xl font-black tracking-widest text-[#FF3057]">
            JRV ADMIN
          </h1>
          <p className="text-xs md:text-sm font-medium text-gray-400 tracking-wider uppercase">
            Management Panel
          </p>
        </div> */}
      </div>

      {/* Footer Text - Subtle Fade In */}
      {/* <div className="absolute bottom-10 text-gray-300 text-xs animate-pulse">
        Loading System...
      </div> */}
    </div>
  );
}
