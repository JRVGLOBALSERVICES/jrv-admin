"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Wait 5 seconds, then trigger the fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-linear-to-br from-[#F15828] via-[#FF3057] to-slate-900 transition-opacity duration-700 ease-out">
      <div className="animate-pulse flex flex-col items-center gap-6">
        <div className="bg-white p-5 rounded-3xl shadow-2xl animate-bounce">
          <Image
            src="/logo.png"
            alt="JRV Loading"
            width={100}
            height={100}
            priority
            className="object-contain"
          />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-white text-3xl font-extrabold tracking-widest drop-shadow-lg">
            JRV ADMIN
          </h1>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            <p className="text-white/90 text-sm font-medium">
              System Loading...
            </p>
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
          </div>
        </div>
      </div>

      {/* Optional: Footer or Version info */}
      <div className="absolute bottom-8 text-white/40 text-xs">
        © JRV Services
      </div>
    </div>
  );
}
