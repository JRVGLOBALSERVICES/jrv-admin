"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export default function FloatingRefresh() {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Only show on iOS devices (iPhone/iPad) where "pull to refresh" might be tricky in PWA mode
    const checkIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(checkIOS);
  }, []);

  const handleHardReload = () => {
    // This forces a reload from the server, ignoring cache.
    // If the session is invalid, your middleware will automatically kick them to login.
    window.location.reload();
  };

  if (!isIOS) return null;

  return (
    <button
      onClick={handleHardReload}
      className="fixed bottom-6 left-6 z-9999 p-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-white shadow-lg active:scale-90 transition-all hover:bg-black/60"
      title="Force Refresh"
    >
      <RefreshCw className="w-6 h-6" />
    </button>
  );
}
