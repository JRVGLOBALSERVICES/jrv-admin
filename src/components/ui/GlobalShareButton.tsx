"use client";

import { Share2 } from "lucide-react";
import { usePathname } from "next/navigation";

export default function GlobalShareButton() {
  const pathname = usePathname();

  // Option: Hide on login page if you want
  if (pathname === "/") return null;

  const handleShare = async () => {
    const url = window.location.href;
    const title = document.title || "JRV Admin";

    // 1. Try Native Mobile Share (Best Experience)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: "Check this out: ",
          url: url,
        });
        return;
      } catch (err) {
        console.log("Share dismissed");
      }
    }

    // 2. Fallback: Open WhatsApp directly
    const waUrl = `https://wa.me/?text=${encodeURIComponent(url)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <button
      onClick={handleShare}
      className="fixed bottom-6 right-6 z-50 p-3.5 bg-green-600 text-white rounded-full shadow-xl shadow-green-900/20 hover:bg-green-700 hover:scale-105 active:scale-95 transition-all border border-green-500 flex items-center justify-center"
      aria-label="Share Page"
    >
      <Share2 className="w-5 h-5" />
    </button>
  );
}
